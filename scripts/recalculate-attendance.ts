// One-time script to recalculate ALL attendance records with corrected timezone logic
// Run with: npx tsx scripts/recalculate-attendance.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function startOfDayVN(date: Date): Date {
    const vnStr = date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vn = new Date(vnStr);
    return new Date(Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate(), 0, 0, 0, 0));
}

function endOfDayVN(date: Date): Date {
    const vnStr = date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vn = new Date(vnStr);
    return new Date(Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate(), 23, 59, 59, 999));
}

async function main() {
    console.log("🔄 Deleting all old attendance records...");
    await prisma.attendance.deleteMany({});

    console.log("📋 Fetching all login sessions...");
    const sessions = await prisma.loginHistory.findMany({
        orderBy: { loginTime: "asc" },
    });

    // Group sessions by userId + Vietnam date
    const dayMap = new Map<string, { userId: string; date: Date; sessions: typeof sessions }>();

    for (const s of sessions) {
        const vnStr = s.loginTime.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
        const vnDate = new Date(vnStr);
        const dateKey = `${vnDate.getFullYear()}-${vnDate.getMonth()}-${vnDate.getDate()}`;
        const key = `${s.userId}|${dateKey}`;

        if (!dayMap.has(key)) {
            dayMap.set(key, {
                userId: s.userId,
                date: new Date(Date.UTC(vnDate.getFullYear(), vnDate.getMonth(), vnDate.getDate())),
                sessions: [],
            });
        }
        dayMap.get(key)!.sessions.push(s);
    }

    console.log(`📊 Processing ${dayMap.size} user-day combinations...`);

    let count = 0;
    for (const [, entry] of dayMap) {
        const dayStart = entry.date;
        const dayEnd = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate(), 23, 59, 59, 999));
        const now = new Date();

        const totalMinutes = entry.sessions.reduce((sum, s) => {
            const sessionStart = new Date(Math.max(s.loginTime.getTime(), dayStart.getTime()));
            const sessionEnd = s.logoutTime
                ? new Date(Math.min(s.logoutTime.getTime(), dayEnd.getTime()))
                : new Date(Math.min(now.getTime(), dayEnd.getTime()));
            if (sessionEnd <= sessionStart) return sum;
            return sum + Math.max(0, Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 60000));
        }, 0);

        const totalHours = totalMinutes / 60;
        let status: "PRESENT" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "UNAPPROVED_LEAVE";
        if (totalHours >= 4) status = "PRESENT";
        else if (totalHours >= 2) status = "HALF_DAY";
        else status = "ABSENT";

        const firstLogin = entry.sessions[0]?.loginTime || null;
        const lastSession = entry.sessions[entry.sessions.length - 1];
        const lastLogout = lastSession?.logoutTime || null;

        const lateTime = "08:30";
        const [lh, lm] = lateTime.split(":").map(Number);
        let isLate = false;
        let lateMinutes = 0;
        if (firstLogin) {
            const vnLogin = new Date(firstLogin.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
            const actual = vnLogin.getHours() * 60 + vnLogin.getMinutes();
            const threshold = lh * 60 + lm;
            isLate = actual > threshold;
            lateMinutes = Math.max(0, actual - threshold);
        }

        await prisma.attendance.create({
            data: {
                userId: entry.userId,
                date: dayStart,
                totalMinutes,
                status,
                firstLogin,
                lastLogout,
                isLate,
                lateMinutes,
            },
        });
        count++;
    }

    console.log(`✅ Created ${count} attendance records.`);
    await prisma.$disconnect();
}

main().catch(console.error);
