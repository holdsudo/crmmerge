# Dealership / Vendor CRM MVP

Next.js MVP for internal vendor deal tracking, reporting, role-based access, and QuickBooks sync readiness.

## Stack

- Next.js App Router
- Prisma ORM
- PostgreSQL for production
- Cookie-based auth with seeded Admin / Manager / Staff users

Use PostgreSQL for production. SQLite can still be used for throwaway local prototypes, but this repo is now configured for PostgreSQL deployments.

## Getting started

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Point `DATABASE_URL` at a PostgreSQL database
4. Run `npm run db:push`
5. Run `npm run db:seed`
6. Start the app with `npm run dev`

## Seeded users

Set `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`, and `SEED_STAFF_PASSWORD` before running `npm run db:seed`.

## Included MVP features

- Login with role display
- Dashboard metrics and recent deals
- Vendors CRUD with summary cards
- Deals CRUD with filters
- Deal detail view with audit history and QuickBooks sync status
- Reports page with CSV export
- Bulk CSV import for vendors and deals by Admin/Manager users
- Settings for defaults, QuickBooks mode, and user management

## Business rules implemented

- Amount must be greater than 0
- Interest rate must be between 0 and 100
- Only Admin and Manager can delete deals
- Closed deals are read-only unless reopened by an Admin

## Google Cloud deployment

Recommended production stack:

- Cloud Run for the web app
- Cloud SQL for PostgreSQL
- Cloud Storage for exported files and backup artifacts

### Required environment variables

- `DATABASE_URL`
- `SESSION_SECRET`
- `CONTRACTS_BUCKET` for persistent PDF storage in production
- `APP_ENCRYPTION_KEY` for document and MFA-secret encryption

### Deploy flow

1. Create a Google Cloud project
2. Enable `run.googleapis.com`, `sqladmin.googleapis.com`, `artifactregistry.googleapis.com`, and `cloudbuild.googleapis.com`
3. Create a Cloud SQL PostgreSQL instance and database
4. Create a Cloud Storage bucket for contract PDFs
5. Set `DATABASE_URL` to the Cloud SQL connection string
6. Build and deploy the container to Cloud Run
7. Run `npm run db:push`
8. Run `npm run db:seed`

Example deploy command:

```bash
gcloud run deploy dealership-vendor-crm \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --add-cloudsql-instances YOUR_PROJECT:us-east1:YOUR_INSTANCE \
  --set-env-vars CONTRACTS_BUCKET=YOUR_BUCKET \
  --set-secrets SESSION_SECRET=SESSION_SECRET:latest \
  --set-secrets DATABASE_URL=DATABASE_URL:latest
```

After the service is up, run Prisma against the production database once to create the schema and optionally seed initial records.
