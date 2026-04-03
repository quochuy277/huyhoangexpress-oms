export type RawOrder = {
  id?: string;
  requestCode: string;
  customerOrderCode?: string | null;
  carrierOrderCode?: string | null;
  shopName?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  receiverWard?: string | null;
  receiverDistrict?: string | null;
  receiverProvince?: string | null;
  status: string;
  deliveryStatus?: string;
  codAmount?: number | { toNumber: () => number };
  createdTime?: Date | null;
  pickupTime?: Date | null;
  lastUpdated?: Date | null;
  publicNotes?: string | null;
  carrierName?: string | null;
  staffNotes?: string | null;
};

export type ProcessedDelayedOrder = {
  id: string;
  requestCode: string;
  customerOrderCode: string;
  carrierOrderCode: string;
  shopName: string;
  receiverName: string;
  receiverPhone: string;
  fullAddress: string;
  status: string;
  deliveryStatus: string;
  codAmount: number;
  createdTime: Date | null;
  carrierName: string;
  delayCount: number;
  delays: { time: string; date: string; reason: string }[];
  uniqueReasons: string[];
  daysAge: number;
  risk: "high" | "medium" | "low";
  riskScore: number;
  staffNotes: string;
  claimOrder?: { issueType: string } | null;
};

const TIMESTAMP_RE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+(.*)$/i;

function normalizeAsciiText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isDeliveryDelayPrefix(value: string) {
  return normalizeAsciiText(value).startsWith("hoan giao hang vi:");
}

function isReturnDelayPrefix(value: string) {
  return normalizeAsciiText(value).startsWith("xac nhan hoan vi:");
}

function isCarrierDelayText(value: string) {
  return normalizeAsciiText(value).includes("delay giao hang vi");
}

function parseTimestamp(token: string): Date | null {
  const match = token.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, hh, mm, dd, mo, yyyy] = match;
  const date = new Date(
    Number.parseInt(yyyy, 10),
    Number.parseInt(mo, 10) - 1,
    Number.parseInt(dd, 10),
    Number.parseInt(hh, 10),
    Number.parseInt(mm, 10),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

type ParsedDelayLine = {
  time: string;
  date: string;
  eventText: string;
};

function parseDelayLine(line: string): ParsedDelayLine | null {
  const match = line.trim().match(TIMESTAMP_RE);

  if (!match) {
    return null;
  }

  return {
    time: match[1],
    date: match[2],
    eventText: match[3].trim(),
  };
}

export function parseDelays(note: string): { time: string; date: string; reason: string }[] {
  const delays: { time: string; date: string; reason: string }[] = [];

  for (const rawLine of note.split("\n")) {
    const parsed = parseDelayLine(rawLine);

    if (!parsed) {
      continue;
    }

    if (isDeliveryDelayPrefix(parsed.eventText) || isReturnDelayPrefix(parsed.eventText)) {
      delays.push({
        time: parsed.time,
        date: parsed.date,
        reason: parsed.eventText.replace(/^.+?:\s*/i, "").trim(),
      });
    }
  }

  return delays.sort((left, right) => {
    const leftTimestamp = parseTimestamp(`${left.time} - ${left.date}`)?.getTime() ?? 0;
    const rightTimestamp = parseTimestamp(`${right.time} - ${right.date}`)?.getTime() ?? 0;

    return leftTimestamp - rightTimestamp;
  });
}

function isDelayEvent(eventText: string): boolean {
  return (
    isDeliveryDelayPrefix(eventText) ||
    isReturnDelayPrefix(eventText) ||
    isCarrierDelayText(eventText)
  );
}

export function getLastDelayDate(publicNotes: string | null): Date | null {
  if (!publicNotes) {
    return null;
  }

  for (const line of publicNotes.split("\n")) {
    const parsed = parseDelayLine(line);

    if (!parsed || !isDelayEvent(parsed.eventText)) {
      continue;
    }

    const date = parseTimestamp(`${parsed.time} - ${parsed.date}`);
    if (date) {
      return date;
    }
  }

  return null;
}

export function getMostRecentTimestampFromNotes(publicNotes: string | null): Date | null {
  if (!publicNotes) {
    return null;
  }

  for (const line of publicNotes.split("\n")) {
    const parsed = parseDelayLine(line);
    if (!parsed) {
      continue;
    }

    const date = parseTimestamp(`${parsed.time} - ${parsed.date}`);
    if (date) {
      return date;
    }
  }

  return null;
}

export function countDelaysInNote(note: string): number {
  return note
    .split("\n")
    .map((line) => parseDelayLine(line))
    .filter((line): line is ParsedDelayLine => Boolean(line))
    .filter((line) => isDeliveryDelayPrefix(line.eventText) || isReturnDelayPrefix(line.eventText))
    .length;
}

export function normalizeReason(reason: string): string {
  const cleaned = reason
    .replace(/\.\s*thoi gian hen:.*$/i, "")
    .replace(/thoi gian hen:.*$/i, "")
    .trim();
  const normalized = normalizeAsciiText(cleaned);

  if (
    /khong goi duoc|khong lien lac duoc|khong the lien he|chan so|khoa may|khong nghe may/.test(
      normalized,
    )
  ) {
    return "Không liên lạc được KH";
  }

  if (/hen lai|hen ngay|kh hen/.test(normalized)) {
    return "KH hẹn lại ngày giao";
  }

  if (/tu choi.*khong dat|khong dat hang/.test(normalized)) {
    return "Từ chối - Không đặt hàng";
  }

  if (/doi y|khong muon nhan/.test(normalized)) {
    return "Từ chối - Đổi ý không nhận";
  }

  if (/hu hong|hu ton|dong goi/.test(normalized)) {
    return "Hàng hư hỏng/đóng gói lỗi";
  }

  if (/sai.*dia chi/.test(normalized)) {
    return "Sai thông tin địa chỉ";
  }

  if (/sai.*sdt|sai.*so dien thoai/.test(normalized)) {
    return "Sai thông tin SĐT";
  }

  if (/khong thuoc buu cuc/.test(normalized)) {
    return "Sai bưu cục";
  }

  if (/qua so lan/.test(normalized)) {
    return "Quá số lần giao";
  }

  if (/xac nhan hoan/.test(normalized)) {
    return "Xác nhận hoàn hàng";
  }

  if (/kh hen giao lai qua/.test(normalized)) {
    return "KH hẹn giao lại quá 3 lần";
  }

  if (/khong lien lac duoc voi kh 3 lan/.test(normalized)) {
    return "Không liên lạc được KH 3 lần";
  }

  return cleaned.substring(0, 60);
}

export function extractReasons(note: string): string[] {
  const reasons: string[] = [];

  for (const rawLine of note.split("\n")) {
    const parsed = parseDelayLine(rawLine);

    if (!parsed) {
      continue;
    }

    if (isDeliveryDelayPrefix(parsed.eventText)) {
      reasons.push(normalizeReason(parsed.eventText.replace(/^.+?:\s*/i, "").trim()));
      continue;
    }

    if (isReturnDelayPrefix(parsed.eventText)) {
      reasons.push("Xác nhận hoàn hàng");
    }
  }

  return reasons.length > 0 ? reasons : ["Không rõ lý do"];
}

export function assessRisk(
  delayCount: number,
  reasons: string[],
  daysAge: number,
  status: string,
): "high" | "medium" | "low" {
  let score = 0;

  if (delayCount >= 4) score += 5;
  else if (delayCount >= 3) score += 4;
  else if (delayCount >= 2) score += 2;
  else score += 1;

  const severeReasons = [
    "Từ chối - Không đặt hàng",
    "Từ chối - Đổi ý không nhận",
    "Hàng hư hỏng/đóng gói lỗi",
    "Sai thông tin địa chỉ",
    "Sai thông tin SĐT",
    "Xác nhận hoàn hàng",
    "Quá số lần giao",
    "KH hẹn giao lại quá 3 lần",
    "Không liên lạc được KH 3 lần",
  ];

  if (reasons.some((reason) => severeReasons.includes(reason))) {
    score += 3;
  }

  if (daysAge >= 10) score += 3;
  else if (daysAge >= 5) score += 2;
  else if (daysAge >= 3) score += 1;

  if (normalizeAsciiText(status).includes("hoan")) {
    score += 1;
  }

  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function processDelayedOrder(order: RawOrder): ProcessedDelayedOrder {
  const note = order.publicNotes || "";
  const status = order.status || "";
  const delays = parseDelays(note);
  const reasons = extractReasons(note);
  const uniqueReasons = [...new Set(reasons)];
  const delayCount = Math.max(delays.length, countDelaysInNote(note));
  const createdDate = order.createdTime ? new Date(order.createdTime) : null;
  const daysAge = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / 86400000) : 0;
  const risk = assessRisk(delayCount, uniqueReasons, daysAge, status);
  const addressParts = [
    order.receiverAddress,
    order.receiverWard,
    order.receiverDistrict,
    order.receiverProvince,
  ].filter(Boolean);

  return {
    id: (order as { id?: string }).id || "",
    requestCode: order.requestCode,
    customerOrderCode: order.customerOrderCode || "",
    carrierOrderCode: order.carrierOrderCode || "",
    shopName: order.shopName || "",
    receiverName: order.receiverName || "",
    receiverPhone: order.receiverPhone || "",
    fullAddress: addressParts.join(" - "),
    status,
    deliveryStatus: order.deliveryStatus || "",
    codAmount:
      typeof order.codAmount === "object" && order.codAmount !== null
        ? order.codAmount.toNumber()
        : Number(order.codAmount ?? 0),
    createdTime: order.createdTime || null,
    carrierName: order.carrierName || "",
    delayCount,
    delays,
    uniqueReasons,
    daysAge,
    risk,
    riskScore: risk === "high" ? 3 : risk === "medium" ? 2 : 1,
    staffNotes: order.staffNotes || "",
    claimOrder: (order as { claimOrder?: { issueType: string } | null }).claimOrder || null,
  };
}
