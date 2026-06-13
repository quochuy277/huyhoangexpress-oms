export function resolveActiveSegment(param: string | null, ids: string[], fallback: string): string {
  return param && ids.includes(param) ? param : fallback;
}
