# Style & Conventions

- Language: TypeScript, ESM (type: module)
- Indentation: 2 spaces; semicolons omitted
- File naming: camelCase.ts, tests as *.test.ts
- Tests live alongside code: packages/**/src/*.test.ts
- Lint/format: ESLint + Prettier
- TDD: strict t-wada (Red → Green → Refactor, smallest steps, triangulation)
- Prefer unit tests (Vitest + jsdom); E2E only for critical flows

Source: AGENTS.md