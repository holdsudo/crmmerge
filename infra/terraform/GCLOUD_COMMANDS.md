# gcloud bootstrap commands

## Authenticate and select project

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Enable required APIs

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudkms.googleapis.com \
  compute.googleapis.com \
  dns.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  servicenetworking.googleapis.com \
  sqladmin.googleapis.com \
  vpcaccess.googleapis.com
```

## Add secret versions after Terraform creates secret containers

```bash
printf '%s' 'REPLACE_WITH_LONG_RANDOM_SESSION_SECRET' | gcloud secrets versions add session-secret --data-file=-
printf '%s' 'REPLACE_WITH_BASE64_32_BYTE_KEY' | gcloud secrets versions add app-encryption-key --data-file=-
printf '%s' 'REPLACE_WITH_DATABASE_URL' | gcloud secrets versions add database-url --data-file=-
printf '%s' 'REPLACE_WITH_ADMIN_SEED_PASSWORD' | gcloud secrets versions add seed-admin-password --data-file=-
printf '%s' 'REPLACE_WITH_MANAGER_SEED_PASSWORD' | gcloud secrets versions add seed-manager-password --data-file=-
printf '%s' 'REPLACE_WITH_STAFF_SEED_PASSWORD' | gcloud secrets versions add seed-staff-password --data-file=-
```

## Build and push image

```bash
gcloud auth configure-docker YOUR_REGION-docker.pkg.dev
docker build -t YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/YOUR_REPOSITORY/YOUR_SERVICE:latest .
docker push YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/YOUR_REPOSITORY/YOUR_SERVICE:latest
```

## Evidence collection commands

```bash
gcloud compute ssl-policies describe crm-ssl-policy --global
gcloud run services describe dealership-vendor-crm --region YOUR_REGION
gcloud sql instances describe YOUR_SQL_INSTANCE
gcloud storage buckets describe gs://YOUR_DOCUMENT_BUCKET
gcloud kms keys describe storage --keyring regulated-data --location YOUR_REGION
gcloud logging buckets describe regulated-audit-logs --location YOUR_REGION --project YOUR_PROJECT_ID
gcloud logging read 'protoPayload.serviceName="cloudkms.googleapis.com"' --limit=20
```
