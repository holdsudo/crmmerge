# Written Information Security Program

## Purpose

This program governs the protection of customer information, deal records, uploaded contract PDFs, authentication material, audit logs, and operational metadata for the Dealership Vendor CRM.

## Data Classification

- Restricted: customer contact data, deal data, contract PDFs, authentication secrets, security logs
- Internal: aggregate operational reports, app settings, vendor contact data
- Public: none

## Required Controls

- MFA for every active user account
- Unique named user accounts only
- Least-privilege access by role
- AES-256-GCM application-level encryption for stored PDFs and MFA secrets
- TLS for every network path
- Secret storage outside source control
- Audit logging for sign-in, password reset, exports, contract views, and record views
- Encrypted backups with restore tests
- Quarterly access review
- Monthly dependency and vulnerability review
- Annual external security assessment

## Roles

- Security owner: business owner or delegated compliance manager
- System administrator: manages hosting, backups, secrets, and incident response
- End users: must use MFA, protect credentials, and report suspected incidents immediately

## Access Rules

- Admin: full administrative control
- Manager: operational control without unrestricted platform administration
- Staff: only assigned or created deal/customer/vendor records

## Change Management

- Production changes require code review or owner approval
- Secrets must be rotated after any suspected compromise
- Public hosting remains disabled until hardening checklist completion

## Review Cadence

- Review this document at least annually and after any material incident
