export const CLAIMS_MOBILE_BREAKPOINT = 768;

export function shouldUseClaimsMobileCards(viewportWidth: number) {
  return viewportWidth < CLAIMS_MOBILE_BREAKPOINT;
}

export function shouldStackClaimsToolsLayout(viewportWidth: number) {
  return viewportWidth < CLAIMS_MOBILE_BREAKPOINT;
}

export function shouldUseClaimsToolsHistoryCards(viewportWidth: number) {
  return viewportWidth < CLAIMS_MOBILE_BREAKPOINT;
}

export function shouldUseClaimsCompensationCards(viewportWidth: number) {
  return viewportWidth < CLAIMS_MOBILE_BREAKPOINT;
}
