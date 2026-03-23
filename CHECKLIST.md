# Validation Checklist

## Terraform

- [ ] `terraform fmt -recursive`
- [ ] `terraform init`
- [ ] `terraform validate`
- [ ] `terraform plan` reviewed
- [ ] Remote state backend configured before production

## HTTPS / TLS

- [ ] `curl -I http://YOUR_DOMAIN` redirects to HTTPS
- [ ] `curl -I https://YOUR_DOMAIN` includes `Strict-Transport-Security`
- [ ] `openssl s_client -connect YOUR_DOMAIN:443 -tls1_1` fails
- [ ] `openssl s_client -connect YOUR_DOMAIN:443 -tls1_2` succeeds
- [ ] certificate is active

## CMEK / HSM

- [ ] Cloud Run uses CMEK
- [ ] Cloud SQL uses CMEK
- [ ] Storage bucket uses default KMS key
- [ ] Logging bucket uses CMEK
- [ ] Artifact Registry uses KMS key
- [ ] key versions show HSM where intended

## KMS / Logging

- [ ] Audit logs enabled for admin/data read/write
- [ ] KMS key usage visible in logs
- [ ] dedicated audit log bucket exists

## Secrets

- [ ] no production secret committed to source
- [ ] all Secret Manager containers have current versions
- [ ] runtime SA has only secret accessor, not admin

## Backups

- [ ] Cloud SQL backups enabled
- [ ] PITR enabled
- [ ] bucket versioning enabled
- [ ] bucket retention enabled
- [ ] restore test documented

## IAM

- [ ] runtime, deployer, key-admin identities are separate
- [ ] runtime SA is not owner/editor
- [ ] developers are not key admins by default

## App Controls

- [ ] secure cookies present
- [ ] HSTS present
- [ ] MFA enrollment works
- [ ] password reset invalidates older sessions
- [ ] PDFs are unreadable at rest outside the app

## Command Set

```bash
curl -I http://YOUR_DOMAIN
curl -I https://YOUR_DOMAIN
openssl s_client -connect YOUR_DOMAIN:443 -tls1_1
openssl s_client -connect YOUR_DOMAIN:443 -tls1_2
gcloud compute ssl-policies describe crm-ssl-policy --global
gcloud run services describe dealership-vendor-crm --region YOUR_REGION --format='yaml(template.encryptionKey)'
gcloud sql instances describe YOUR_SQL_INSTANCE --format='yaml(diskEncryptionConfiguration,settings.backupConfiguration)'
gcloud storage buckets describe gs://YOUR_BUCKET --format='yaml(encryption,versioning,retentionPolicy)'
gcloud logging buckets describe regulated-audit-logs --location YOUR_REGION
gcloud logging read 'protoPayload.serviceName="cloudkms.googleapis.com"' --limit=20
gcloud projects get-iam-policy YOUR_PROJECT_ID --format=json
```
