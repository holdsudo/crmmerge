resource "google_service_account" "runtime" {
  account_id   = "crm-runtime"
  display_name = "CRM runtime service account"
  project      = var.project_id
}

resource "google_service_account" "deployer" {
  account_id   = "crm-deployer"
  display_name = "CRM deployment service account"
  project      = var.project_id
}

resource "google_service_account" "key_admin" {
  account_id   = "crm-kms-admin"
  display_name = "CRM KMS admin service account"
  project      = var.project_id
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "deployer_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/cloudbuild.builds.editor",
    "roles/iam.serviceAccountUser",
    "roles/secretmanager.secretAccessor",
    "roles/cloudsql.admin"
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "key_admin_roles" {
  for_each = toset([
    "roles/cloudkms.admin",
    "roles/cloudkms.viewer",
    "roles/logging.viewer"
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.key_admin.email}"
}
