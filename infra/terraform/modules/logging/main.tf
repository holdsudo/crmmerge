resource "google_project_iam_audit_config" "all_admin_read_write" {
  project = var.project_id
  service = "allServices"

  audit_log_config { log_type = "ADMIN_READ" }
  audit_log_config { log_type = "DATA_READ" }
  audit_log_config { log_type = "DATA_WRITE" }
}

resource "google_project_iam_audit_config" "kms_data_access" {
  project = var.project_id
  service = "cloudkms.googleapis.com"

  audit_log_config { log_type = "ADMIN_READ" }
  audit_log_config { log_type = "DATA_READ" }
  audit_log_config { log_type = "DATA_WRITE" }
}

resource "google_logging_project_bucket_config" "audit" {
  project        = var.project_id
  location       = var.location
  retention_days = var.retention_days
  bucket_id      = var.bucket_id
  description    = "Dedicated CMEK-backed audit evidence bucket."

  cmek_settings {
    kms_key_name = var.kms_key_name
  }
}

resource "google_logging_project_sink" "audit_to_bucket" {
  project                = var.project_id
  name                   = "regulated-audit-to-cmek-bucket"
  destination            = "logging.googleapis.com/projects/${var.project_id}/locations/${var.location}/buckets/${google_logging_project_bucket_config.audit.bucket_id}"
  unique_writer_identity = true
  filter                 = <<-EOT
    logName:"cloudaudit.googleapis.com"
    OR resource.type="cloud_run_revision"
    OR resource.type="cloudsql_database"
    OR resource.type="gcs_bucket"
  EOT
}
