# Worktracker Security Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Close the seven findings in the 2026-09-28 Codex Security scan and address currently vulnerable locked dependencies without losing legitimate invoice, logo, or recovery workflows.

**Architecture:** Scope private React Query state to the active account. Move invoice creation and lifecycle changes into PostgreSQL functions so number allocation, item totals, and entry state changes commit together. Enforce logo limits in Storage, back up object bytes with the database, and refuse payment PDFs with missing supplier details.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query 5, Supabase/PostgreSQL/Storage, GitHub Actions, Node test runner.

**Spec:** Codex Security scan report `a1baefe4-ba9a-4de8-b72a-09133ee912c2` (`report.md` in the Codex Security scan directory).

## Global Constraints

- Preserve existing data; never silently renumber historical invoices or delete existing logos.
- Derive invoice ownership from `auth.uid()` in database functions; client JSON cannot choose a user ID.
- Payment PDFs must not substitute another person's identity or account.
- Backup output must stay encrypted before artifact upload and must include database and logo bytes.
- Leave the user's untracked original-checkout `AGENTS.md` untouched.

## Review Focus

- A selected entry from another client/account or one already billed must abort the whole invoice transaction.
- Concurrent linked invoices must not claim the same entry or receive the same invoice number.
- Mixed hourly rates and fractional hours must reconcile each stored item with invoice subtotal.
- Switching accounts in one browser tab must never display previous account query data.
- Backup/restore must preserve Storage bytes and detect a partial or corrupted download.

---

### Task 1: Private cache and payment document

**Files:** `components/providers/QueryProvider.tsx`, `features/billing/components/InvoicePdf.tsx`, `app/(dashboard)/invoices/[id]/page.tsx`, focused tests.

- [ ] Write tests for account cache isolation and missing PDF supplier/account details; observe failures.
- [ ] Replace the QueryClient synchronously when the active user ID changes.
- [ ] Remove fallback personal/company/payment literals and block PDF generation until required details exist.
- [ ] Run focused tests, `npm test`, and `npm run type-check`.

### Task 2: Atomic invoice boundary and numbering

**Files:** `supabase/migrations/20260928_secure_invoices.sql`, `features/billing/services/invoiceService.ts`, `types/database.ts`, `features/billing/components/StandaloneInvoiceForm.tsx`, focused PostgreSQL tests.

- [ ] Write failing database tests for rollback, ownership, concurrency, numbering, and mixed rates.
- [ ] Add authenticated RPC functions with explicit ownership checks, row locking, transactional item/entry updates, monotonic per-user/year numbers, and a unique invoice-number constraint.
- [ ] Route app writes through those RPCs and validate positive standalone quantities at the form boundary.
- [ ] Deny direct invoice/item writes that could bypass the RPC invariants.
- [ ] Run database tests, `npm test`, and `npm run type-check`.

### Task 3: Storage controls and recoverability

**Files:** `supabase/migrations/20260928_secure_logos.sql`, `components/LogoUpload.tsx`, `.github/workflows/supabase-backup.yml`, `scripts/backup-logos.mjs`, `docs/BACKUPS.md`, focused tests.

- [ ] Write failing tests for Storage path and backup pagination/content verification.
- [ ] Restrict the logo bucket by MIME/size and one canonical path per account while keeping historical objects readable.
- [ ] Export logo bytes and a checksummed manifest, encrypt them before GitHub artifact upload, and document/test restore.
- [ ] Run focused tests, `npm test`, and `npm run type-check`.

### Task 4: Dependency and final verification

**Files:** `package.json`, `package-lock.json`, documentation for new debugging/recovery behavior.

- [ ] Record the baseline `npm audit` findings, then update vulnerable dependencies to patched compatible versions.
- [ ] Run focused security regression tests, full tests, type-check, direct ESLint, production build when environment permits, and `npm audit`.
- [ ] Review the final diff for bypasses and regressions, then obtain one fresh read-only security review and address confirmed issues.
- [ ] Document migration, backup secrets, and remaining live deployment verification steps.
