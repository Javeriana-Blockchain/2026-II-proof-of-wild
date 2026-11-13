import type { IdentityProvider } from "@/ports/identity-provider";
import { IdentityRejectedError, ValidationError, VerificationRequiredError } from "@/modules/shared/errors";
import {
  type BiometricEvidence,
  checkBiometrics,
  documentTail,
  type DocumentType,
  type IdentityLevel,
  normalizeDocumentNumber,
  requiredLevel,
  UNVERIFIED_LIMIT,
  type VerificationMethod,
} from "./rules";

/** Lo que queda guardado de una verificación. Sin fotos, sin plantilla del rostro y sin el número completo. */
export interface IdentityRecord {
  userId: string;
  documentType: DocumentType;
  documentLast4: string;
  method: VerificationMethod;
  faceMatch: number | null;
  provider: string;
  providerReference: string;
  verifiedAt: Date;
}

export interface IdentityStore {
  find(userId: string): Promise<IdentityRecord | null>;
  /** Cuenta que ya verificó este documento (por su hash con clave), si la hay. */
  findUserByDocument(documentHash: string): Promise<string | null>;
  save(record: IdentityRecord & { documentHash: string; consentAt: Date }): Promise<void>;
  remove(userId: string): Promise<void>;
}

export interface VerifyIdentityInput {
  documentType: DocumentType;
  documentNumber: string;
  /** Autorización expresa para tratar datos sensibles (biometría). */
  consent: boolean;
  evidence: BiometricEvidence;
}

export interface IdentityServiceOptions {
  /** Hash con clave del documento: detecta un documento usado en dos cuentas sin guardar el número. */
  hashDocument: (type: DocumentType, number: string) => string;
  now?: () => Date;
}

/** Verificación de identidad por niveles (ADR-21). */
export class IdentityService {
  constructor(
    private readonly provider: IdentityProvider,
    private readonly store: IdentityStore,
    private readonly options: IdentityServiceOptions,
  ) {}

  async verify(userId: string, input: VerifyIdentityInput): Promise<IdentityRecord> {
    if (!input.consent) {
      throw new ValidationError("Para verificar tu identidad necesitamos tu autorización para tratar datos sensibles.");
    }
    const number = normalizeDocumentNumber(input.documentType, input.documentNumber);
    checkBiometrics(input.evidence);

    const documentHash = this.options.hashDocument(input.documentType, number);
    const owner = await this.store.findUserByDocument(documentHash);
    if (owner && owner !== userId) throw new ValidationError("Este documento ya verificó otra cuenta.");

    const result = await this.provider.check({ documentType: input.documentType, documentNumber: number });
    if (!result.approved) throw new IdentityRejectedError(result.reason ?? "El registro no confirmó tu documento.");

    const now = (this.options.now ?? (() => new Date()))();
    const record: IdentityRecord = {
      userId,
      documentType: input.documentType,
      documentLast4: documentTail(number),
      method: input.evidence.method,
      faceMatch: input.evidence.method === "biometria" ? round(input.evidence.faceMatch ?? 0) : null,
      provider: this.provider.name,
      providerReference: result.reference,
      verifiedAt: now,
    };
    await this.store.save({ ...record, documentHash, consentAt: now });
    return record;
  }

  status(userId: string): Promise<IdentityRecord | null> {
    return this.store.find(userId);
  }

  async levelOf(userId: string): Promise<IdentityLevel> {
    return (await this.store.find(userId)) ? 2 : 1;
  }

  /** Un aporte por encima del límite exige identidad verificada. */
  async assertCanContribute(userId: string, amount: string): Promise<void> {
    if (requiredLevel(amount) === 1) return;
    if ((await this.levelOf(userId)) === 2) return;
    throw new VerificationRequiredError(
      `Para aportes de más de ${UNVERIFIED_LIMIT} USDC verifica tu identidad. Toma unos dos minutos.`,
    );
  }

  /** Derecho de supresión (Ley 1581): borra la verificación y vuelve al nivel 1. */
  remove(userId: string): Promise<void> {
    return this.store.remove(userId);
  }
}

function round(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}
