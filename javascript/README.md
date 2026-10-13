# CodeAtlas — JavaScript

A command-line programming showcase built with **JavaScript and Node.js**.

CodeAtlas is a multi-language learning and experimentation project designed to explore how different programming languages implement common programming concepts, algorithms, data processing, file operations, concurrency, and language-specific features.

This directory contains the JavaScript implementation.

## Overview

The JavaScript version uses a CLI application called **Mini Data Lab** to demonstrate practical programming concepts through a shared set of features.

The project is intended to help developers:

* Explore JavaScript syntax, language features, and standard library APIs.
* Experiment with data structures, algorithms, and text processing.
* Practice file handling, persistence, asynchronous operations, and worker threads.
* Test and benchmark implementations.
* Compare JavaScript behavior with implementations in other languages.
* Learn through small, testable modules rather than one large program.

## Requirements

* [Node.js](https://nodejs.org/) 22 or newer
* npm, included with Node.js

No third-party npm packages are required. The project uses Node.js built-in modules and APIs.

## Getting Started

### 1. Navigate to the project

```bash
cd javascript
```

### 2. Install dependencies

```bash
npm install
```

The project currently requires no external packages. npm can generate or update `package-lock.json` from the package configuration.

### 3. Start the application

```bash
npm start
```

### 4. Run the tests

```bash
npm test
```

### 5. Run tests in watch mode

```bash
npm run test:watch
```

The application and test commands assume that the corresponding source files have been implemented.

## Project Structure

```text
javascript/
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
├── src/
│   ├── index.js
│   ├── menu.js
│   ├── cli/
│   │   ├── prompt.js
│   │   └── output.js
│   ├── model/
│   │   ├── record.js
│   │   └── store.js
│   ├── modules/
│   │   ├── records.js
│   │   ├── analyze.js
│   │   ├── algorithms.js
│   │   ├── text.js
│   │   ├── files.js
│   │   ├── tasks.js
│   │   ├── diagnostics.js
│   │   └── showcase.js
│   └── lib/
│       ├── errors.js
│       ├── format.js
│       └── random.js
├── workers/
│   └── cpu-task.js
├── test/
│   ├── record.test.js
│   ├── store.test.js
│   ├── records.test.js
│   ├── analyze.test.js
│   ├── algorithms.test.js
│   ├── text.test.js
│   ├── files.test.js
│   ├── tasks.test.js
│   └── cli.test.js
└── data/
    └── sample-records.json
```

## Module Responsibilities

| Location       | Responsibility                               |
| -------------- | -------------------------------------------- |
| `src/index.js` | Application entry point and startup          |
| `src/menu.js`  | CLI menu loop and feature dispatch           |
| `src/cli/`     | Terminal input and formatted output          |
| `src/model/`   | Record validation and in-memory data storage |
| `src/modules/` | Feature implementations and workflows        |
| `src/lib/`     | Small, reusable utility functions            |
| `workers/`     | Worker-thread demonstrations                 |
| `test/`        | Automated tests using Node.js built-ins      |
| `data/`        | Sample data for the JavaScript application   |

## Planned Feature Areas

* **Record management:** Create, read, update, delete, search, and filter records.
* **Data analysis:** Summaries, statistics, grouping, sorting, and aggregation.
* **Algorithms:** Searching, sorting, and other practical algorithm demonstrations.
* **Text processing:** String manipulation, parsing, and text analysis.
* **File operations:** Read, write, export, and process structured data.
* **Tasks and concurrency:** Promises, asynchronous workflows, and worker threads.
* **Diagnostics and benchmarks:** Measure execution time and inspect selected runtime behavior.
* **Language showcase:** Demonstrate JavaScript-specific features and idiomatic patterns.

Feature availability will depend on implementation progress.

## Development Principles

1. Use modern JavaScript with ES modules.
2. Keep the CLI interface separate from core logic.
3. Prefer named exports for reusable functions and classes.
4. Include explicit `.js` extensions in relative imports.
5. Keep model and storage functions independent of terminal input and output.
6. Validate user input and handle errors consistently.
7. Use Node.js built-in APIs instead of third-party packages.
8. Write deterministic tests that exercise core functions directly.
9. Keep behavior consistent with the shared CodeAtlas specification and test data.
10. Document differences where a language feature cannot be reproduced identically across implementations.

## Testing

Tests use Node.js's built-in test runner and assertion library.

```bash
npm test
```

Tests should cover normal cases, edge cases, invalid input, and expected error behavior. Cross-language features should also be validated against the shared fixtures and expected results in the repository's root `test-data/` directory.

## Dependencies

This implementation intentionally avoids third-party npm dependencies.

Examples of permitted Node.js built-ins include:

* `node:readline/promises`
* `node:fs/promises`
* `node:worker_threads`
* `node:perf_hooks`
* `node:test`
* `node:assert/strict`

## Project Status

The directory structure and package configuration define the intended architecture. Individual features, tests, and CLI workflows should be marked complete as they are implemented and verified.

## Part of CodeAtlas

This implementation is one part of the broader CodeAtlas project, which compares programming concepts and practical implementations across multiple languages.

The goal is not to translate source code automatically. It is to provide a consistent learning environment for understanding each language's capabilities, conventions, trade-offs, and standard library.
