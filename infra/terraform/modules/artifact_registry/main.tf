resource "google_artifact_registry_repository" "container" {
  provider      = google-beta
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_name
  format        = "DOCKER"
  kms_key_name  = var.kms_key_name
  description   = "CMEK-protected repository for the CRM image."
  labels        = var.labels
}
