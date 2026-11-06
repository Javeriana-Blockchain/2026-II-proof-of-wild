/** Errores de dominio. La capa de presentación los traduce a respuestas HTTP. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "validation");
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, "not_found");
  }
}

export class PermissionError extends DomainError {
  constructor(message: string) {
    super(message, "forbidden");
  }
}

/** RN-02: quien registra un gasto o un hito no puede validarlo. */
export class SeparationOfDutiesError extends PermissionError {}

export class InvalidTransitionError extends DomainError {
  constructor(message: string) {
    super(message, "invalid_transition");
  }
}

export class NotSupportedError extends DomainError {
  constructor(message: string) {
    super(message, "not_supported");
  }
}

/** La red demostró que la transacción no cumple como aporte (RN-03). */
export class ContributionRejectedError extends DomainError {
  constructor(message: string) {
    super(message, "contribution_rejected");
  }
}
