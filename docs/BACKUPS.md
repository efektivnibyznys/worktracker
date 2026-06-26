# Supabase Backups

Production data is backed up by the `Supabase encrypted backup` GitHub Actions workflow.

## Schedule

- Runs daily at 02:17 UTC
- Can be started manually from GitHub Actions
- Uploads an encrypted `.dump.gpg` artifact
- Artifacts are retained for 90 days

## Required GitHub Secrets

Set these repository secrets before running the workflow:

```text
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-...pooler.supabase.com:6543/postgres
BACKUP_PASSPHRASE=<strong-random-passphrase>
```

Use the Supabase dashboard to copy the direct or pooled database connection string. The password must be the database password, not the anon key.

## Restore

Download the encrypted artifact from GitHub Actions, then decrypt it:

```bash
gpg --decrypt worktracker-YYYYMMDDTHHMMSSZ.dump.gpg > worktracker.dump
```

Restore into a clean PostgreSQL/Supabase database:

```bash
pg_restore \
  --dbname "$TARGET_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  worktracker.dump
```

Keep the backup passphrase outside GitHub as well, for example in a password manager. Without the passphrase, the encrypted backups cannot be restored.
