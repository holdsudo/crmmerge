resource "random_password" "app" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*()-_=+"
}

resource "google_sql_database_instance" "postgres" {
  project             = var.project_id
  name                = var.instance_name
  region              = var.region
  database_version    = "POSTGRES_16"
  encryption_key_name = var.kms_key_name
  deletion_protection = true

  settings {
    tier              = var.tier
    availability_type = "REGIONAL"
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    user_labels       = var.labels

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.private_network
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = var.sql_backup_retention
        retention_unit   = "COUNT"
      }
    }

    insights_config {
      query_insights_enabled  = true
      record_client_address   = false
      record_application_tags = false
    }
  }
}

resource "google_sql_database" "app" {
  project  = var.project_id
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  name     = "crm_app"
  password = random_password.app.result
}
