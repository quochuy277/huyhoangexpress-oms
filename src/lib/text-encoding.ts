const MOJIBAKE_HINT = /[ÃÂÄ]/;

export function repairUtf8Mojibake(value: string) {
  if (!value || !MOJIBAKE_HINT.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    if (!decoded || decoded.includes("\uFFFD")) {
      return value;
    }

    return decoded;
  } catch {
    return value;
  }
}

export function normalizeVietnameseAscii(value: string) {
  return repairUtf8Mojibake(value)
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
