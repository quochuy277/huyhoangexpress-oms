export const CLAIMS_MOBILE_BREAKPOINT = 768;

export function shouldUseClaimsMobileCards(viewportWidth: number) {
  return viewportWidth < CLAIMS_MOBILE_BREAKPOINT;
}
