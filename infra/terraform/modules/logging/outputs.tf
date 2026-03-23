output "bucket_name" {
  value = google_logging_project_bucket_config.audit.bucket_id
}
