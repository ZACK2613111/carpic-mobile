```markdown
# carpic-mobile Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to contribute effectively to the `carpic-mobile` repository—a TypeScript/React codebase for a mobile application. You'll learn the project's coding conventions, commit patterns, and step-by-step workflows for adding features, updating the database schema, integrating UI, and improving offline upload reliability. The guide includes code examples, testing patterns, and suggested commands to streamline your development process.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `vinDecoder.ts`, `inspectionReport.tsx`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import utils from '@lib/utils';
    import VinDecoder from '@features/vinDecoder/vinDecoder';
    ```

### Export Style
- Use **default exports** for modules.
  - Example:
    ```typescript
    // src/features/vinDecoder/vinDecoder.ts
    const decodeVin = (vin: string) => { /* ... */ };
    export default decodeVin;
    ```

### Commit Patterns
- Follow **Conventional Commits**.
- Prefixes: `feat`, `perf`, `chore`, `refactor`, `fix`
- Example:
  ```
  feat: add VIN decoder logic and tests
  fix: correct upload queue retry logic
  ```

## Workflows

### Add New Feature with Pure Logic and Tests
**Trigger:** When you want to add a new pure logic feature (e.g., VIN decoder, inspection report) that is testable and visible in the app or viewer.  
**Command:** `/new-pure-feature`

1. Create or update a pure logic module in `src/features/[feature]/[feature].ts` or `src/lib/[feature].ts`.
2. Write unit tests in `src/features/[feature]/__tests__/[feature].test.ts` or `src/lib/__tests__/[feature].test.ts`.
3. Integrate the logic into the relevant app screen (e.g., `src/app/project/[id].tsx`, `src/app/editor/[id].tsx`).
4. Update the web viewer if needed (`web/viewer.html`).
5. Update publish logic if needed (`src/features/publish/publish.ts`).

**Example:**
```typescript
// src/features/vinDecoder/vinDecoder.ts
const decodeVin = (vin: string) => { /* logic */ };
export default decodeVin;

// src/features/vinDecoder/__tests__/vinDecoder.test.ts
import decodeVin from '../vinDecoder';
test('decodes VIN correctly', () => {
  expect(decodeVin('1HGCM82633A004352')).toEqual(/* expected result */);
});
```

---

### Database Schema Change with API and Docs
**Trigger:** When you want to add a new table, column, or security policy to the database.  
**Command:** `/new-table`

1. Edit or create a new Supabase schema file: `supabase/schema_vX.sql`.
2. Update or create API/data helpers in `src/features/[feature]/*.api.ts`.
3. Update types in `src/features/[feature]/types.ts` if needed.
4. Update documentation (`docs/GETTING_STARTED.md`, `docs/PLAN_10_JOURS.md`, `README.md`) to reflect schema changes.

**Example:**
```sql
-- supabase/schema_v3.sql
ALTER TABLE inspections ADD COLUMN mileage INTEGER;
```
```typescript
// src/features/inspections/inspections.api.ts
export const getInspections = async () => { /* ... */ };
```

---

### Feature Development with UI Integration and Publish
**Trigger:** When you want to add a new user-facing feature with UI, logic, and publishing/export support.  
**Command:** `/new-feature`

1. Implement or update UI components in `src/app/*/[id].tsx` and `src/features/[feature]/*.tsx`.
2. Add or update logic modules in `src/features/[feature]/*.ts`.
3. Add or update tests in `src/features/[feature]/__tests__/*.test.ts`.
4. Update publish logic in `src/features/publish/publish.ts`.
5. Update the web viewer (`web/viewer.html`) if the feature is visible in shared links.

**Example:**
```typescript
// src/features/branding/BrandingBanner.tsx
const BrandingBanner = ({ brand }) => <div>{brand}</div>;
export default BrandingBanner;
```

---

### Add or Harden Offline Upload Queue
**Trigger:** When you want to make uploads more resilient to offline or flaky network conditions.  
**Command:** `/offline-upload`

1. Implement or update upload queue logic in `src/lib/uploadQueue/*` and `src/features/uploads/*`.
2. Write or update tests in `src/lib/__tests__/uploadQueue.test.ts`.
3. Integrate with capture or editor flows in `src/app/capture/*/[id].tsx` or `src/app/editor/[id].tsx`.
4. Update UI to reflect pending uploads or upload status.

**Example:**
```typescript
// src/lib/uploadQueue/uploadQueue.ts
class UploadQueue { /* ... */ }
export default UploadQueue;

// src/lib/__tests__/uploadQueue.test.ts
import UploadQueue from '../uploadQueue';
test('retries failed uploads', () => { /* ... */ });
```

## Testing Patterns

- **Framework:** Jest
- **Test file pattern:** `*.test.ts`
- **Location:** Place tests in `__tests__` directories alongside the module.
  - Example: `src/features/branding/__tests__/branding.test.ts`
- **Example:**
  ```typescript
  import brandingHelper from '../branding';
  test('applies branding correctly', () => {
    expect(brandingHelper('CarPic')).toBe('CarPic');
  });
  ```

## Commands

| Command           | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| /new-pure-feature | Add a new pure logic module with tests and integrate it      |
| /new-table        | Add or modify a database table, update API, and docs         |
| /new-feature      | Add a new user-facing feature with UI and publish support    |
| /offline-upload   | Implement or improve offline upload queue and retry logic    |
```
