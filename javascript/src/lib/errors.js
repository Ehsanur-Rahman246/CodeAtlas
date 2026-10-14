// Base class for every error CodeAtlas throws on purpose.
// Having one prent lets the CLI tell "expected" errors apart from real bugs
// with a single `instanceof AppError` check.

export class AppError extends Error {
  constructor(message, options) {
    // `options` can carry `{ cause }`, the original error that triggered this one.
    super(message, options);
    // `new target` is the class actually being constructed, so subclass
    // get their own name automatically (e.g. "ValidationError").
    this.name = new.target.name;
  }
}

// Thrown when input data breaks the record contract.
// It carries All problems found, so the user can fix them in one pass.

export class ValidationError extends AppError {
  constructor(issues, options) {
    // Join the issues into one readable message for logs and stack traces.
    super(`Validation failed: ${issues.join("; ")}`, options);
    // Keep a copy of the list so callers can display one issue per line.
    this.issues = [...issues];
  }
}

// Thrown when adding a record whose id is already in the store.
export class DuplicateIdError extends AppError {
  constructor(id, options) {
    super(`A record with id "${id}" already exists`, options);
    // Keep the id as data so callers don't have to parse the message.
    this.id = id;
  }
}

// Thrown when an operation targets an id that is not in the store.
export class NotFoundError extends AppError {
  constructor(id, options) {
    super(`No record with id "${id}"`, options);
    this.id = id;
  }
}

// Thrown when the input stream ends: Ctrl+D, Ctrl+C, or piped input running out.
// The app treats it as "the user is done", not as a failure.
export class InputClosedError extends AppError {
  constructor(options) {
    super('Input stream closed', options);
  }
}
