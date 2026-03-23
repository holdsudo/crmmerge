# Incident Response Process

## Trigger Conditions

- Unauthorized access to customer or deal records
- Suspicious login activity
- Contract PDF exposure
- Data corruption or ransomware event
- Lost device with access to the CRM

## Immediate Actions

1. Disable public access to the service.
2. Preserve logs, database state, and affected files.
3. Rotate impacted secrets and invalidate active sessions.
4. Identify affected users, records, and time window.
5. Notify legal/compliance counsel before external notification.

## Technical Containment Checklist

- Disable affected user accounts
- Rotate `SESSION_SECRET` and `APP_ENCRYPTION_KEY` if needed
- Rotate database credentials
- Review recent `SecurityEvent` and `AuditLog` records
- Verify backup integrity before recovery

## Notification

- Follow NJ and FTC-required timelines and counsel guidance
- Notify regulators, partners, and customers only after impact analysis and counsel review

## Recovery

- Restore from known-good backups if integrity is in doubt
- Confirm MFA and password reset for affected users
- Document root cause and remediation
- Schedule outside review after containment
