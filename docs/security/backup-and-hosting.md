# Backup and Hosting Requirements

## Hosting Baseline

- No public production hosting until MFA, encryption, and operating controls are active
- Use private object storage for contracts
- Enforce least-privilege IAM on hosting, storage, database, and secrets
- Restrict administrative access to managed identities and MFA-protected users

## Backup Baseline

- Daily database backups
- Daily encrypted contract storage backup or replicated bucket policy
- Off-platform backup retention for at least 30 days
- Quarterly restore test with written evidence

## Secret Management

- Store `DATABASE_URL`, `SESSION_SECRET`, and `APP_ENCRYPTION_KEY` in a secret manager
- Never commit production secrets to source control
- Rotate secrets after personnel changes or incidents

## Monitoring

- Collect application logs, auth logs, export logs, and storage access logs
- Alert on repeated login failures, contract downloads, and role/admin changes
