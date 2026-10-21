# Railway Ticket Reservation System

A beginner-friendly college project demonstrating confirmed seats and a FIFO waiting list with a Java Spring Boot API and a responsive React website.

## Run & Operate

- Start the **API Server** and **Railway Ticket Reservation** workflows in Replit.
- `pnpm --filter @workspace/api-server run dev` — run the Java Spring Boot API (port 8080)
- `pnpm --filter @workspace/railway-reservations run dev` — run the React website
- `cd artifacts/api-server && mvn -f java/pom.xml -DskipTests package` — build the Java API
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Java 17+ and Maven are required for the backend.

## Stack

- Java 17+ and Spring Boot 3.4
- React, TypeScript, Vite, and pnpm workspaces
- OpenAPI contract with generated TypeScript client hooks
- In-memory `ArrayList`, FIFO `ArrayDeque` queue, and `HashSet`

## Where things live

- `artifacts/api-server/java/` — Java Spring Boot API and reservation data structures
- `artifacts/railway-reservations/` — React reservation interface
- `lib/api-spec/openapi.yaml` — API contract and generated client source
- `README.md` — setup, demo steps, and presentation notes

## Architecture decisions

- Reservation state stays in memory to make the data-structure operations easy to follow; server restarts clear it.
- Confirmed seats are managed separately from the FIFO waiting queue.

## Product

Book, search, and cancel tickets; view five confirmed seats and waiting passengers; automatically promote the first waiting passenger when a confirmed seat opens.

## User preferences

- Keep the implementation beginner-friendly and suitable for a college presentation.
- Use actual Java backend logic for all reservation operations.

## Gotchas

- The app's web and API workflows must both be running for reservation features to work.
- Reservation records are not persisted across Java server restarts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
