# Supabase Backups

The `Supabase encrypted backup` GitHub Actions workflow saves a PostgreSQL dump and every object in the `logos` Storage bucket in one encrypted archive. Storage bytes are needed in addition to database metadata. The archive includes a manifest with object paths, sizes, MIME types, and SHA-256 checksums.

## Safety gate before deploying the security migrations

Do not change the production schema until a fresh database **and** Storage backup has completed and a restore into a disposable database has been checked. Set up the new Supabase secret key and run the backup workflow manually before deploying the migrations. A manual run decrypts its own archive, verifies the logo manifest and checksums, restores the database into a fresh local Supabase PostgreSQL database, applies the security migrations there, and checks that every preexisting business and Storage metadata row is unchanged. Download the encrypted artifact and keep a copy outside the production project until the new version is verified.

Record counts of `clients`, `phases`, `projects`, `entries`, `settings`, `invoices`, `invoice_items`, and logo objects before and after deployment. Check for duplicate `(user_id, invoice_number)` pairs before applying `20260928_secure_invoices.sql`; if any exist, the migration aborts as one transaction and leaves existing invoices untouched. Apply both SQL migrations together with the application release, then confirm historical invoices and logos can still be opened. The local preservation test in `tests/sql/migration_preservation_before.sql` and `migration_preservation_after.sql` verifies that the migrations leave preexisting business and logo metadata rows unchanged on PostgreSQL 17.

## Schedule and setup

- Daily at 02:17 UTC; manual runs are available from GitHub Actions.
- Encrypted `.tar.gz.gpg` artifacts are retained for 90 days.
- Set GitHub Actions secrets `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `BACKUP_PASSPHRASE`. Create a new `sb_secret_...` key for the backup job in Supabase Project Settings → API Keys. It has administrative access and must never be exposed as a `NEXT_PUBLIC_` variable. Legacy `service_role` keys may be disabled and should not be re-enabled for backups.
- Keep a copy of the passphrase outside GitHub, such as in a password manager.
- Run one manual workflow after adding the new secrets. A missing secret or failed Storage download makes the job fail instead of publishing a database-only archive. Manual runs also decrypt the resulting archive, verify every logo checksum, and restore the database into a disposable local Supabase PostgreSQL container before reporting success.

## Restore rehearsal

The manual GitHub Actions workflow performs the tested database restore into a disposable PostgreSQL database created from `template0`. A default initialized database already contains Supabase system objects such as `graphql`, causing duplicate object errors during full restore. The workflow checks restored row counts and rehearses both migrations against the production snapshot. Keep the successful workflow run and its encrypted artifact together as recovery evidence.

Wait for TCP readiness (`pg_isready -h 127.0.0.1`) before the restore. The image's temporary initialization server accepts socket connections but shuts down before the final server starts; socket readiness can therefore report success too early. The rehearsal also applies `20261002_clean_invoice_descriptions.sql` and checks that the snapshot's existing rows remain unchanged.

To restore into a new hosted Supabase project during a real recovery, use the current [Supabase platform restore guidance](https://supabase.com/docs/guides/self-hosting/restore-from-platform) and test the full procedure on a separate project first. A raw `pg_restore --clean` against an initialized hosted project can conflict with managed schemas and must not be run against the production project. After the database restore, use the new project's URL and secret key to restore Storage objects:

```bash
mkdir -p restore-worktracker
gpg --decrypt worktracker-YYYYMMDDTHHMMSSZ.tar.gz.gpg | tar -xz -C restore-worktracker
SUPABASE_URL="$TARGET_SUPABASE_URL" \
SUPABASE_SECRET_KEY="$TARGET_SUPABASE_SECRET_KEY" \
node scripts/logo-storage-archive.mjs restore restore-worktracker/logos
```

The restore command verifies every archived checksum before uploading any logo. If historical files exceed the target bucket's MIME or size restrictions, it temporarily expands those bucket settings for the restore and returns them to their original values afterward. It then rewrites `settings.logo_url` from the source project URL to the target project URL. Existing files with legacy names are preserved. If the process is interrupted while uploading, inspect the target `logos` bucket restrictions and restore the intended 2 MB/image allowlist before allowing normal users back into the project. The Supabase project-wide upload limit still applies; raise it temporarily in the target project's Storage settings if an archived object exceeds it.

After restoring, sign in as a test user and check a historical invoice PDF, its logo, client details, item totals, and linked work entries. Also confirm that a new invoice number follows the previous highest number. Do not delete the encrypted artifact until this rehearsal succeeds.

The database dump and Storage downloads are sequential, so they are not an exact cross-service snapshot during concurrent logo changes. Schedule the job for a quiet period and repeat a failed or inconsistent backup.
