/**
 * KYC package completeness for staff review / submit-pan gate.
 * Keeps signup players off the approval queue until they have uploaded the same
 * document set required before PAN number submission.
 */
export function parseKycDocumentsArray(player: { kycDocuments?: unknown }): any[] {
  const raw = (player as any).kycDocuments;
  return Array.isArray(raw) ? raw : [];
}

export function playerKycDocsMeetSubmitPanGate(player: { kycDocuments?: unknown }): boolean {
  const kycDocs = parseKycDocumentsArray(player);
  const hasUrl = (d: any) => !!(d?.fileUrl || d?.url);
  const t = (d: any) => String(d?.documentType || d?.type || '').toLowerCase();

  const hasPanCardDoc = kycDocs.some((d) => t(d) === 'pan_card' && hasUrl(d));
  const hasAadhaarFront = kycDocs.some((d) => t(d) === 'aadhaar_front' && hasUrl(d));
  const hasAadhaarBack = kycDocs.some((d) => t(d) === 'aadhaar_back' && hasUrl(d));
  const hasLegacyGovId = kycDocs.some((d) => t(d) === 'government_id' && hasUrl(d));
  const hasAadhaarRequirement = (hasAadhaarFront && hasAadhaarBack) || hasLegacyGovId;

  return hasAadhaarRequirement && hasPanCardDoc;
}
