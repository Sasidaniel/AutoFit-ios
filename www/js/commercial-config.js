// Public configuration only. Never put provider secrets or signing keys here.
export const COMMERCIAL_CONFIG = Object.freeze({
  operatorDisplayName: 'ששי דניאל / Sasi Daniel',
  operatorLegalName: '',
  privacyEmail: '',
  businessAddress: '',
  businessRegistrationNumber: '',
  termsApproved: false,
  privacyApproved: false,
  targetMarkets: [],
  commerceEnabled: false,
});
export const POLICY_IS_DRAFT = true;

export function commercialReadiness(config = COMMERCIAL_CONFIG) {
  const missing = [];
  if (POLICY_IS_DRAFT) missing.push('finalPolicyPublication');
  if (!config.operatorLegalName?.trim()) missing.push('operatorLegalName');
  if (!config.privacyEmail?.trim()) missing.push('privacyEmail');
  if (!config.businessAddress?.trim()) missing.push('businessAddress');
  if (!config.termsApproved) missing.push('termsApproved');
  if (!config.privacyApproved) missing.push('privacyApproved');
  if (!Array.isArray(config.targetMarkets) || !config.targetMarkets.length) missing.push('targetMarkets');
  return { ready: missing.length === 0 && config.commerceEnabled === true, missing };
}
