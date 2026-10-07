# ADR 0001 — pnpm monorepo: NestJS API, Next.js web, shared package

Date: 2026-10-06
Status: accepted

## Context

The product has an HTTP API, a browser UI, and a set of contracts (request and
response shapes, AI output shapes) that both sides must agree on exactly. The
reviewer audience needs to clone one repository and run everything with one
command.

## Decision

A single pnpm workspace with `apps/api` (NestJS), `apps/web` (Next.js App Router)
and `packages/shared` (`@fis/shared`: zod schemas, inferred types, the
`IntelligenceService` port, constants). Root scripts `dev`, `build`, `lint`,
`typecheck` fan out with `pnpm -r`. The shared package is consumed via workspace
protocol and TypeScript paths pointing at `src/index.ts`, so no build step is needed
for local development.

## Alternatives rejected

- Two repositories with a published contracts package: version drift between API
  and web on every contract change, and a publish step reviewers would have to run.
- Next.js route handlers as the API (single app): simpler to run, but the AI
  provider abstraction, transactions and module boundaries the spec needs map
  poorly onto route handlers, and the backend rules in force assume NestJS.
- npm or yarn workspaces: both work; pnpm is chosen for strict hoisting (an app
  cannot import a dependency it did not declare) and faster installs.

## Consequences

- One `pnpm install` at the root; `pnpm dev` starts both apps.
- Contract changes are one PR touching `packages/shared` plus both consumers.
- Strict hoisting means every package declares its own dependencies explicitly.
