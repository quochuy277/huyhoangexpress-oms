import { performance } from "node:perf_hooks";

import { clearCrmShopsInitialDataCache, getCrmProspectsInitialData, getCrmShopsInitialData } from "@/lib/crm-page-data";
import { getDashboardSummaryData } from "@/lib/dashboard-overview-data";
import { getDelayedPageData } from "@/lib/delayed-page-data";
import { prisma } from "@/lib/prisma";
import { getReturnsTabData } from "@/lib/returns-page-data";

type SampleMap = Record<string, number[]>;

type TimingSummary = {
  avg: number;
  p95: number;
};

function parseServerTiming(header: string | undefined): SampleMap {
  const samples: SampleMap = {};
  if (!header) return samples;

  const parts = header.split(",");
  for (const part of parts) {
    const metric = part.trim();
    if (!metric) continue;
    const [name, ...rest] = metric.split(";");
    const durSegment = rest.find((segment) => segment.startsWith("dur="));
    if (!durSegment) continue;
    const value = Number(durSegment.replace("dur=", ""));
    if (!Number.isFinite(value)) continue;
    if (!samples[name]) samples[name] = [];
    samples[name].push(value);
  }

  return samples;
}

function addTimingSamples(target: SampleMap, source: SampleMap) {
  for (const [name, values] of Object.entries(source)) {
    if (!target[name]) target[name] = [];
    target[name].push(...values);
  }
}

function summarize(values: number[]): TimingSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return {
    avg,
    p95: sorted[p95Index],
  };
}

function summarizeMap(samples: SampleMap): Record<string, TimingSummary> {
  const result: Record<string, TimingSummary> = {};
  for (const [key, values] of Object.entries(samples)) {
    if (!values.length) continue;
    result[key] = summarize(values);
  }
  return result;
}

async function main() {
  const runs = 5;
  const adminUser = {
    id: "benchmark-admin",
    role: "ADMIN",
    permissions: {
      canViewCRM: true,
      canViewAllShops: true,
    },
  };

  const delayedFullSamples: SampleMap = {};
  const delayedSkipSamples: SampleMap = {};
  const crmShopsSamples: SampleMap = {};
  const crmProspectsSamples: SampleMap = {};
  const dashboardSamples: number[] = [];
  const returnsSamples: number[] = [];

  await getDelayedPageData({ page: 1, pageSize: 50, skipFacets: false });
  await getDelayedPageData({ page: 1, pageSize: 50, skipFacets: true });

  for (let i = 0; i < runs; i += 1) {
    const delayedFull = await getDelayedPageData({ page: 1, pageSize: 50, skipFacets: false });
    addTimingSamples(delayedFullSamples, parseServerTiming(delayedFull._timing));

    const delayedSkip = await getDelayedPageData({ page: 1, pageSize: 50, skipFacets: true });
    addTimingSamples(delayedSkipSamples, parseServerTiming(delayedSkip._timing));
  }

  clearCrmShopsInitialDataCache();
  await getCrmShopsInitialData(adminUser);

  for (let i = 0; i < runs; i += 1) {
    const crmShops = await getCrmShopsInitialData(adminUser);
    addTimingSamples(crmShopsSamples, parseServerTiming(crmShops._timing));
  }

  await getCrmProspectsInitialData(adminUser);
  for (let i = 0; i < runs; i += 1) {
    const crmProspects = await getCrmProspectsInitialData(adminUser);
    addTimingSamples(crmProspectsSamples, parseServerTiming(crmProspects._timing));
  }

  await getDashboardSummaryData("ADMIN");
  for (let i = 0; i < runs; i += 1) {
    const dashboardStart = performance.now();
    await getDashboardSummaryData("ADMIN");
    dashboardSamples.push(performance.now() - dashboardStart);
  }

  await getReturnsTabData({ tab: "partial", page: 1, pageSize: 50 });
  for (let i = 0; i < runs; i += 1) {
    const returnsStart = performance.now();
    await getReturnsTabData({ tab: "partial", page: 1, pageSize: 50 });
    returnsSamples.push(performance.now() - returnsStart);
  }

  const delayedFullSummary = summarizeMap(delayedFullSamples);
  const delayedSkipSummary = summarizeMap(delayedSkipSamples);
  const delayedReductionPct =
    delayedFullSummary.total && delayedSkipSummary.total
      ? ((delayedFullSummary.total.p95 - delayedSkipSummary.total.p95) / delayedFullSummary.total.p95) * 100
      : null;

  const output = {
    measuredAt: new Date().toISOString(),
    runs,
    delayed: {
      full: delayedFullSummary,
      skipFacets: delayedSkipSummary,
      p95ReductionPercent: delayedReductionPct,
    },
    crmShops: summarizeMap(crmShopsSamples),
    crmProspects: summarizeMap(crmProspectsSamples),
    dashboardSummary: summarize(dashboardSamples),
    returns: summarize(returnsSamples),
  };

  console.log(JSON.stringify(output, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
