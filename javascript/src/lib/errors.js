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
        super(`Validation failed: ${issues.join('; ')}`, options);
        // Keep a copy of the list so callers can display one issue per line.
        this.issues = [...issues];
    }
}
