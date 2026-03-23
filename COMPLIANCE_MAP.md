# NJDOBI-Oriented Control Map

This repository is aligned to NJDOBI-oriented controls for Nonpublic Information protection. It is **not** a legal compliance conclusion.

| Requirement | Implementation | Evidence to Collect |
| --- | --- | --- |
| HTTPS enforced | HTTP forwarding rule redirects to HTTPS in `infra/terraform/modules/lb/main.tf` | `curl -I http://YOUR_DOMAIN`, URL map export |
| TLS minimum 1.2 | `google_compute_ssl_policy.strict` enforces `TLS_1_2` minimum | `gcloud compute ssl-policies describe crm-ssl-policy --global` |
| FIPS-oriented frontend policy | Custom AES-GCM ECDHE SSL policy in `modules/lb/main.tf` | SSL policy output, auditor sign-off |
| Encrypt client data in transit | HTTPS LB, Cloud SQL encrypted connector path, secure cookies and headers | LB config, cookie/header captures |
| Encrypt Cloud Run data at rest with customer key | `template.encryption_key` in `modules/run/main.tf` | `gcloud run services describe ... --format='yaml(template.encryptionKey)'` |
| Encrypt Cloud SQL at rest with CMEK | `encryption_key_name` in `modules/sql/main.tf` | `gcloud sql instances describe ...` |
| Encrypt documents at rest with CMEK | Storage bucket `default_kms_key_name` in `modules/storage/main.tf` | bucket describe output |
| Encrypt logs at rest where supported | CMEK-backed Logging bucket in `modules/logging/main.tf` | logging bucket describe output |
| Encrypt regulated PDFs before storage | AES-256-GCM in [encryption.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/lib/encryption.ts) and [contracts.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/lib/contracts.ts) | code review, test evidence |
| Customer-controlled key management | Cloud KMS key ring/keys in `modules/kms` | Terraform plan, KMS describe output |
| Hardware-backed key protection | `protection_level = HSM` on high-sensitivity keys in `modules/kms/main.tf` | `gcloud kms keys versions list` |
| No hardcoded secrets | Secret Manager secret containers, runtime secret references, no production secrets in source | repo scan output, secrets inventory |
| Key rotation | `rotation_period = 7776000s` in `modules/kms/main.tf` | KMS key describe output |
| KMS audit logging | project IAM audit config and dedicated log bucket in `modules/logging/main.tf` | audit log queries |
| Least-privilege IAM | separate runtime, deployer, key-admin SAs in `modules/iam/main.tf` | IAM policy export |
| Secure cookies | `Secure`, `HttpOnly`, `SameSite=strict` in [auth.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/lib/auth.ts) | browser capture |
| Security headers | HSTS/CSP/frame/content-type/referrer/COOP/CORP in [next.config.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/next.config.ts) | `curl -I https://YOUR_DOMAIN` |
| MFA capability | TOTP MFA in [totp.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/lib/totp.ts), [auth.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/lib/auth.ts), [page.tsx](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/app/(app)/security/page.tsx) | screenshots, security events |
| Audit logging of sensitive actions | [security.ts](/Users/championautofinance/Desktop/ChatGPT/Projects/dealership-vendor-crm/src/lib/security.ts) plus Logging exports | sample records and log queries |
| Encrypted backups and retention | Cloud SQL backups + PITR, Storage versioning/retention | SQL and Storage describe outputs |

## Audit Evidence to Retain

- Terraform plan/apply logs
- SSL policy, backend service, and forwarding rule exports
- Cloud Run, Cloud SQL, Storage, KMS, Secret Manager, and Logging describe outputs
- KMS key version outputs showing HSM protection level
- Browser screenshots for HTTPS redirect, cert status, headers, secure cookies, MFA
- Cloud Audit Logs samples for KMS, Secret Manager, IAM, Cloud Run, Cloud SQL
- Backup settings and restore test records
