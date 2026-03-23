resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(var.secret_ids)
  project   = var.project_id
  secret_id = each.value
  labels    = var.labels

  replication {
    user_managed {
      replicas {
        location = var.region
        customer_managed_encryption {
          kms_key_name = var.kms_key_name
        }
      }
    }
  }
}

resource "google_secret_manager_secret_iam_member" "runtime_access" {
  for_each  = google_secret_manager_secret.secrets
  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.runtime_service_acct}"
}
