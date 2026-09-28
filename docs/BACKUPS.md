# Supabase Backups

The `Supabase encrypted backup` GitHub Actions workflow saves a PostgreSQL dump and every object in the `logos` Storage bucket in one encrypted archive. Storage bytes are needed in addition to database metadata. The archive includes a manifest with object paths, sizes, MIME types, and SHA-256 checksums.

## Safety gate before deploying the security migrations

Do not change the production schema until a fresh database **and** Storage backup has completed and a restore into a separate project has been checked. Set up the new Supabase secret key and run the backup workflow manually before deploying the migrations. Download the encrypted artifact, verify that it contains `database.dump` and `logos/manifest.json`, and perform the restore rehearsal below. Keep that artifact outside the production project until the new version is verified.

Record counts of `clients`, `phases`, `projects`, `entries`, `settings`, `invoices`, `invoice_items`, and logo objects before and after deployment. Check for duplicate `(user_id, invoice_number)` pairs before applying `20260928_secure_invoices.sql`; if any exist, the migration aborts as one transaction and leaves existing invoices untouched. Apply both SQL migrations together with the application release, then confirm historical invoices and logos can still be opened. The local preservation test in `tests/sql/migration_preservation_before.sql` and `migration_preservation_after.sql` verifies that the migrations leave preexisting business and logo metadata rows unchanged on PostgreSQL 17.

## Schedule and setup

- Daily at 02:17 UTC; manual runs are available from GitHub Actions.
- Encrypted `.tar.gz.gpg` artifacts are retained for 90 days.
- Set GitHub Actions secrets `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `BACKUP_PASSPHRASE`. Create a new `sb_secret_...` key for the backup job in Supabase Project Settings → API Keys. It has administrative access and must never be exposed as a `NEXT_PUBLIC_` variable. Legacy `service_role` keys may be disabled and should not be re-enabled for backups.
- Keep a copy of the passphrase outside GitHub, such as in a password manager.
- Run one manual workflow after adding the new secrets. A missing secret or failed Storage download makes the job fail instead of publishing a database-only archive.

## Restore rehearsal

Restore into a separate Supabase project first. Use its database URL, project URL, and new secret key as the target values. Download the encrypted artifact and run:

```bash
mkdir -p restore-worktracker
gpg --decrypt worktracker-YYYYMMDDTHHMMSSZ.tar.gz.gpg | tar -xz -C restore-worktracker
pg_restore --dbname "$TARGET_DATABASE_URL" --clean --if-exists --no-owner --no-acl restore-worktracker/database.dump
SUPABASE_URL="$TARGET_SUPABASE_URL" \
SUPABASE_SECRET_KEY="$TARGET_SUPABASE_SECRET_KEY" \
node scripts/logo-storage-archive.mjs restore restore-worktracker/logos
```

The restore command verifies every archived checksum before uploading any logo. If historical files exceed the target bucket's MIME or size restrictions, it temporarily expands those bucket settings for the restore and returns them to their original values afterward. It then rewrites `settings.logo_url` from the source project URL to the target project URL. Existing files with legacy names are preserved. If the process is interrupted while uploading, inspect the target `logos` bucket restrictions and restore the intended 2 MB/image allowlist before allowing normal users back into the project. The Supabase project-wide upload limit still applies; raise it temporarily in the target project's Storage settings if an archived object exceeds it.

After restoring, sign in as a test user and check a historical invoice PDF, its logo, client details, item totals, and linked work entries. Also confirm that a new invoice number follows the previous highest number. Do not delete the encrypted artifact until this rehearsal succeeds.

The database dump and Storage downloads are sequential, so they are not an exact cross-service snapshot during concurrent logo changes. Schedule the job for a quiet period and repeat a failed or inconsistent backup.
