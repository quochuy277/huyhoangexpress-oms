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
  risk: 'high' | 'medium' | 'low';
  riskScore: number;
  staffNotes: string;
  claimOrder?: { issueType: string } | null;
};

export function parseDelays(note: string): { time: string; date: string; reason: string }[] {
  const delays: { time: string; date: string; reason: string }[] = [];
  const regex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*Hoãn giao hàng vì:\s*([^\n]+)/g;
  let m;
  while ((m = regex.exec(note)) !== null) {
    delays.push({ time: m[1], date: m[2], reason: m[3].trim() });
  }
  return delays;
}

/**
 * Parse a timestamp token "HH:MM - DD/MM/YYYY" into a Date object.
 * Returns null if the format doesn't match.
 */
function parseTimestamp(token: string): Date | null {
  const m = token.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, hh, mm, dd, mo, yyyy] = m;
  const d = new Date(parseInt(yyyy), parseInt(mo) - 1, parseInt(dd), parseInt(hh), parseInt(mm));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Check if a line's event text represents a delay/return event.
 * Matches: "Hoãn giao hàng vì:", "Xác nhận hoàn vì:", lines containing "Delay"
 */
function isDelayEvent(eventText: string): boolean {
  if (eventText.startsWith('Hoãn giao hàng vì:')) return true;
  if (eventText.startsWith('Xác nhận hoàn vì:')) return true;
  if (eventText.includes('Delay giao hàng vì')) return true;
  return false;
}

/**
 * Extract the date of the MOST RECENT delay/return event from publicNotes.
 *
 * Data contract (verified against real DB):
 *   - Each line format: "HH:MM - DD/MM/YYYY <Event description>"
 *   - Notes are stored newest → oldest (top = most recent).
 *
 * Events considered as "delay":
 *   - "Hoãn giao hàng vì:" — explicit delivery delay
 *   - "Xác nhận hoàn vì:" — return confirmation (also a delay event)
 *   - Lines containing "Delay giao hàng vì" — carrier delay entries
 *
 * Algorithm:
 *   1. Split by newlines, scan line by line (top-down = newest-first).
 *   2. Return the timestamp of the FIRST line matching any delay pattern
 *      (first occurrence = most recent, no need to sort).
 */
export function getLastDelayDate(publicNotes: string | null): Date | null {
  if (!publicNotes) return null;

  // Regex to extract the leading timestamp + event text in one pass
  const LINE_RE = /^\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4})\s+(.*)/;

  const lines = publicNotes.split('\n');

  for (const line of lines) {
    const linear = LINE_RE.exec(line);
    if (!linear) continue;

    const [, timestamp, rest] = linear;
    if (!isDelayEvent(rest)) continue;

    // Found the most-recent delay line — parse and return immediately
    const date = parseTimestamp(timestamp.trim());
    if (date) return date;
  }

  return null;
}

/**
 * Get the timestamp of the very first (most recent) event in publicNotes.
 * Used as a fallback when no "Hoãn giao hàng vì:" line exists.
 * Notes are stored newest → oldest, so the first timestamped line = most recent event.
 */
export function getMostRecentTimestampFromNotes(publicNotes: string | null): Date | null {
  if (!publicNotes) return null;

  const LINE_RE = /^\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4})\s+/;

  for (const line of publicNotes.split('\n')) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const date = parseTimestamp(m[1].trim());
    if (date) return date;
  }

  return null;
}

export function countDelaysInNote(note: string): number {
  const matches = note.match(/Hoãn giao hàng vì:/g);
  if (!matches) return 0;
  let count = matches.length;
  const lanMatches = note.match(/Giao hàng lần (\d+):/g);
  if (lanMatches) {
    const maxLan = Math.max(...lanMatches.map(s => parseInt(s.match(/\d+/)![0])));
    if (maxLan > count) count = maxLan;
  }
  return count;
}

export function extractReasons(note: string): string[] {
  const reasons: string[] = [];
  const regex = /Hoãn giao hàng vì:\s*([^\n]+)/g;
  let m;
  while ((m = regex.exec(note)) !== null) {
    let reason = m[1].trim();
    if (reason.includes('Giao hàng lần')) {
      const subs = reason.match(/(?:Delay giao hàng vì|Không giao được hàng vì)\s+([^G\n]+)/g);
      if (subs) {
        subs.forEach(sr => {
          const c = sr.replace(/^(Delay giao hàng vì|Không giao được hàng vì)\s+/, '').trim();
          if (c) reasons.push(normalizeReason(c));
        });
      } else {
        reasons.push(normalizeReason(reason));
      }
    } else {
      reasons.push(normalizeReason(reason));
    }
  }
  if (note.includes('Xác nhận hoàn vì')) reasons.push('Xác nhận hoàn hàng');
  return reasons.length > 0 ? reasons : ['Không rõ lý do'];
}

export function normalizeReason(r: string): string {
  r = r.replace(/\.\s*Thời gian hẹn:.*$/i, '').replace(/Thời gian hẹn:.*$/i, '').trim();
  if (/Không gọi được|Không liên lạc được|không thể liên hệ|Chặn số|khóa máy|không nghe máy/i.test(r)) return 'Không liên lạc được KH';
  if (/hẹn lại|hẹn ngày|KH hẹn/i.test(r)) return 'KH hẹn lại ngày giao';
  if (/Từ chối.*Không đặt|Không đặt hàng/i.test(r)) return 'Từ chối - Không đặt hàng';
  if (/Đổi ý|không muốn nhận/i.test(r)) return 'Từ chối - Đổi ý không nhận';
  if (/hư hỏng|hư tổn|đóng gói/i.test(r)) return 'Hàng hư hỏng/đóng gói lỗi';
  if (/sai.*địa chỉ/i.test(r)) return 'Sai thông tin địa chỉ';
  if (/sai.*SĐT|sai.*số điện thoại/i.test(r)) return 'Sai thông tin SĐT';
  if (/không thuộc bưu cục/i.test(r)) return 'Sai bưu cục';
  if (/quá số lần/i.test(r)) return 'Quá số lần giao';
  if (/Xác nhận hoàn/i.test(r)) return 'Xác nhận hoàn hàng';
  if (/KH hẹn giao lại quá/i.test(r)) return 'KH hẹn giao lại quá 3 lần';
  if (/Không liên lạc được với KH 3 lần/i.test(r)) return 'Không liên lạc được KH 3 lần';
  return r.substring(0, 60);
}

export function assessRisk(
  delayCount: number,
  reasons: string[],
  daysAge: number,
  status: string
): 'high' | 'medium' | 'low' {
  let s = 0;

  // Delay count scoring
  if (delayCount >= 4) s += 5;
  else if (delayCount >= 3) s += 4;
  else if (delayCount >= 2) s += 2;
  else s += 1;

  // Severe reason scoring
  const severe = [
    'Từ chối - Không đặt hàng',
    'Từ chối - Đổi ý không nhận',
    'Hàng hư hỏng/đóng gói lỗi',
    'Sai thông tin địa chỉ',
    'Sai thông tin SĐT',
    'Xác nhận hoàn hàng',
    'Quá số lần giao',
    'KH hẹn giao lại quá 3 lần',
    'Không liên lạc được KH 3 lần',
  ];
  if (reasons.some(r => severe.includes(r))) s += 3;

  // Age scoring
  if (daysAge >= 10) s += 3;
  else if (daysAge >= 5) s += 2;
  else if (daysAge >= 3) s += 1;

  // Status scoring
  if (status.includes('Hoãn')) s += 1;

  // Risk level
  if (s >= 7) return 'high';
  if (s >= 4) return 'medium';
  return 'low';
}

export function processDelayedOrder(order: RawOrder): ProcessedDelayedOrder {
  const note = order.publicNotes || '';
  const status = order.status || '';

  const delays = parseDelays(note);
  const reasons = extractReasons(note);
  const uniqueReasons = [...new Set(reasons)];
  const delayCount = Math.max(delays.length, countDelaysInNote(note));

  const createdDate = order.createdTime ? new Date(order.createdTime) : null;
  const daysAge = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / 86400000) : 0;
  const risk = assessRisk(delayCount, uniqueReasons, daysAge, status);

  const addrParts = [
    order.receiverAddress,
    order.receiverWard,
    order.receiverDistrict,
    order.receiverProvince
  ].filter(Boolean);

  return {
    id: (order as any).id || '',
    requestCode: order.requestCode,
    customerOrderCode: order.customerOrderCode || '',
    carrierOrderCode: order.carrierOrderCode || '',
    shopName: order.shopName || '',
    receiverName: order.receiverName || '',
    receiverPhone: order.receiverPhone || '',
    fullAddress: addrParts.join(' - '),
    status,
    deliveryStatus: order.deliveryStatus || '',
    codAmount: Number(order.codAmount ?? 0),
    createdTime: order.createdTime || null,
    carrierName: order.carrierName || '',
    delayCount,
    delays,
    uniqueReasons,
    daysAge,
    risk,
    riskScore: risk === 'high' ? 3 : risk === 'medium' ? 2 : 1,
    staffNotes: order.staffNotes || '',
    claimOrder: (order as any).claimOrder || null,
  };
}
