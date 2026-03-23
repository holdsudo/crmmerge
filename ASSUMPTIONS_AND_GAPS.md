# Assumptions and Gaps

## Assumptions

- Cloud Run is preferred over GKE for a smaller, more auditable production stack.
- One primary domain fronts one regional app.
- Cloud SQL PostgreSQL is acceptable for the workload.
- Secret values are populated after Terraform creates secret containers.
- A secured remote Terraform backend will be configured before production use.

## Gaps / Manual Review

1. No legal conclusion is made here; counsel/compliance review is required.
2. Google external HTTPS load balancing does not expose a literal FIPS profile switch; the stack uses the safest reasonable custom TLS 1.2+ AES-GCM ECDHE policy instead.
3. Not every Google-managed control plane surface supports CMEK. Cloud DNS and Google-managed certificates are notable examples and require documented compensating controls.
4. The default `_Required` Logging bucket cannot be replaced; the stack adds a separate CMEK-backed audit bucket for retained evidence.
5. Cloud Armor / WAF is not included yet and is recommended as a follow-on control.
6. Secret rotation cadence is documented, but the operational owner and runbook still need approval.
7. Backup restore testing must be executed and recorded; Terraform only configures the backup features.
8. The Node.js runtime/container is not being claimed as a FIPS-validated cryptographic module.
9. MFA capability is implemented in the app, but organizational enforcement and rollout still require policy and user enablement.
