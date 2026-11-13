export { IdentityService } from "./service";
export type { IdentityRecord, IdentityServiceOptions, IdentityStore, VerifyIdentityInput } from "./service";
export {
  BIOMETRIC_THRESHOLDS,
  checkBiometrics,
  DOCUMENT_LABELS,
  documentTail,
  normalizeDocumentNumber,
  requiredLevel,
  UNVERIFIED_LIMIT,
} from "./rules";
export type { BiometricEvidence, DocumentType, IdentityLevel, VerificationMethod } from "./rules";
