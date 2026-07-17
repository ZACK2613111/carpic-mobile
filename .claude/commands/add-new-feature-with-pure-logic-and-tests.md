---
name: add-new-feature-with-pure-logic-and-tests
description: Workflow command scaffold for add-new-feature-with-pure-logic-and-tests in carpic-mobile.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-feature-with-pure-logic-and-tests

Use this workflow when working on **add-new-feature-with-pure-logic-and-tests** in `carpic-mobile`.

## Goal

Implements a new pure logic module (e.g., VIN decoder, inspection report, branding, concurrency helper), adds unit tests, and integrates it into the app and/or web viewer.

## Common Files

- `src/features/*/[feature].ts`
- `src/features/*/__tests__/[feature].test.ts`
- `src/app/project/[id].tsx`
- `src/app/editor/[id].tsx`
- `src/features/publish/publish.ts`
- `web/viewer.html`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update a pure logic module in src/features/[feature]/[feature].ts or src/lib/[feature].ts
- Write unit tests in src/features/[feature]/__tests__/[feature].test.ts or src/lib/__tests__/[feature].test.ts
- Integrate the logic into the relevant app screen (e.g., src/app/project/[id].tsx, src/app/editor/[id].tsx)
- Update the web viewer if needed (web/viewer.html)
- Update publish logic if needed (src/features/publish/publish.ts)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.