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
  codAmount?: number;
  createdTime?: Date | null;
  pickupTime?: Date | null;
  lastUpdated?: Date | null;
  publicNotes?: string | null;
  carrierName?: string | null;
  staffNotes?: string | null;
};

export type ProcessedDelayedOrder = {
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
 * Extract the date of the LAST delay event from publicNotes.
 * Parses lines matching: "HH:MM - DD/MM/YYYY Hoãn giao hàng vì: ..."
 * Returns the most recent delay date, or null if no delays found.
 */
export function getLastDelayDate(publicNotes: string | null): Date | null {
  if (!publicNotes) return null;

  const delays: { time: string; date: string; dateObj: Date }[] = [];
  const regex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*Hoãn giao hàng vì:/g;
  let match;

  while ((match = regex.exec(publicNotes)) !== null) {
    const [, time, day, month, year] = match;
    const [h, m] = time.split(':').map(Number);
    const dateObj = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      h,
      m
    );
    delays.push({ time, date: `${day}/${month}/${year}`, dateObj });
  }

  if (delays.length === 0) return null;
  delays.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  return delays[0].dateObj;
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
    requestCode: order.requestCode,
    customerOrderCode: order.customerOrderCode || '',
    carrierOrderCode: order.carrierOrderCode || '',
    shopName: order.shopName || '',
    receiverName: order.receiverName || '',
    receiverPhone: order.receiverPhone || '',
    fullAddress: addrParts.join(' - '),
    status,
    deliveryStatus: order.deliveryStatus || '',
    codAmount: order.codAmount || 0,
    createdTime: order.createdTime || null,
    carrierName: order.carrierName || '',
    delayCount,
    delays,
    uniqueReasons,
    daysAge,
    risk,
    riskScore: risk === 'high' ? 3 : risk === 'medium' ? 2 : 1,
    staffNotes: order.staffNotes || '',
  };
}
