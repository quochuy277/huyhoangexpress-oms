export function syncExternalClaimDetail(
  currentDetailClaimId: string | null,
  externalDetailClaimId?: string | null,
) {
  if (!externalDetailClaimId) {
    return {
      nextDetailClaimId: currentDetailClaimId,
      shouldConsume: false,
    };
  }

  return {
    nextDetailClaimId: externalDetailClaimId,
    shouldConsume: true,
  };
}
