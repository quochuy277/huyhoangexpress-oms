import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Health check — no auth required.
 * Demonstrates the pattern but kept simple since it doesn't need apiHandler.
 */
export async function GET() {
    const start = Date.now();

    let dbOk = false;
    let dbLatency = 0;

    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatency = Date.now() - dbStart;
        dbOk = true;
    } catch {
        dbOk = false;
    }

    const totalLatency = Date.now() - start;
    const status = dbOk ? "ok" : "degraded";

    return NextResponse.json(
        {
            status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks: {
                database: {
                    status: dbOk ? "ok" : "error",
                    latencyMs: dbLatency,
                },
            },
            responseTimeMs: totalLatency,
        },
        { status: dbOk ? 200 : 503 }
    );
}
