locals {
  required_apis = [
    "artifactregistry.googleapis.com",
    "cloudkms.googleapis.com",
    "compute.googleapis.com",
    "dns.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "vpcaccess.googleapis.com"
  ]
}

resource "google_project_service" "required" {
  for_each                   = toset(local.required_apis)
  project                    = var.project_id
  service                    = each.value
  disable_on_destroy         = false
  disable_dependent_services = false
}

module "kms" {
  source       = "./modules/kms"
  project_id   = var.project_id
  location     = var.billing_region
  key_rotation = "7776000s"
  labels       = var.labels

  keys = {
    cloud_run = { protection_level = "HSM" }
    sql       = { protection_level = "HSM" }
    storage   = { protection_level = "HSM" }
    secrets   = { protection_level = "HSM" }
    logs      = { protection_level = "HSM" }
    artifacts = { protection_level = "HSM" }
  }

  depends_on = [google_project_service.required]
}

module "iam" {
  source       = "./modules/iam"
  project_id   = var.project_id
  labels       = var.labels
  kms_keys     = module.kms.key_ids
  secret_names = var.runtime_secret_names
}

module "network" {
  source     = "./modules/network"
  project_id = var.project_id
  region     = var.region
  labels     = var.labels

  depends_on = [google_project_service.required]
}

module "artifact_registry" {
  source          = "./modules/artifact_registry"
  project_id      = var.project_id
  region          = var.region
  repository_name = var.artifact_repository_name
  kms_key_name    = module.kms.key_ids.artifacts
  labels          = var.labels
}

module "secrets" {
  source               = "./modules/secrets"
  project_id           = var.project_id
  region               = var.region
  secret_ids           = var.runtime_secret_names
  kms_key_name         = module.kms.key_ids.secrets
  labels               = var.labels
  runtime_service_acct = module.iam.runtime_service_account_email
}

module "storage" {
  source            = "./modules/storage"
  project_id        = var.project_id
  location          = var.region
  bucket_name       = var.document_bucket_name
  kms_key_name      = module.kms.key_ids.storage
  retention_days    = var.contract_retention_days
  runtime_principal = "serviceAccount:${module.iam.runtime_service_account_email}"
  labels            = var.labels
}

module "logging" {
  source         = "./modules/logging"
  project_id     = var.project_id
  location       = var.billing_region
  bucket_id      = var.log_bucket_name
  retention_days = var.log_retention_days
  kms_key_name   = module.kms.key_ids.logs
  labels         = var.labels
}

module "sql" {
  source               = "./modules/sql"
  project_id           = var.project_id
  region               = var.region
  instance_name        = var.sql_instance_name
  database_name        = var.sql_database_name
  tier                 = var.sql_tier
  kms_key_name         = module.kms.key_ids.sql
  private_network      = module.network.vpc_self_link
  sql_backup_retention = var.sql_backup_retention_count
  labels               = var.labels

  depends_on = [module.network]
}

module "run" {
  source                            = "./modules/run"
  project_id                        = var.project_id
  region                            = var.region
  service_name                      = var.web_service_name
  runtime_service_account_email     = module.iam.runtime_service_account_email
  encryption_key                    = module.kms.key_ids.cloud_run
  image_uri                         = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repository_name}/${var.web_service_name}:latest"
  cloudsql_instance_connection_name = module.sql.instance_connection_name
  vpc_connector                     = module.network.vpc_connector_id
  labels                            = var.labels
  plain_env = {
    NODE_ENV         = "production"
    CONTRACTS_BUCKET = module.storage.bucket_name
    MFA_ISSUER       = "Dealership Vendor CRM"
  }
  secret_env = {
    SESSION_SECRET        = "session-secret"
    APP_ENCRYPTION_KEY    = "app-encryption-key"
    DATABASE_URL          = "database-url"
    SEED_ADMIN_PASSWORD   = "seed-admin-password"
    SEED_MANAGER_PASSWORD = "seed-manager-password"
    SEED_STAFF_PASSWORD   = "seed-staff-password"
  }

  depends_on = [module.secrets, module.sql, module.artifact_registry]
}

module "lb" {
  source                 = "./modules/lb"
  project_id             = var.project_id
  region                 = var.region
  domain_name            = var.domain_name
  cloud_run_service_name = module.run.service_name
  cloud_run_service_id   = module.run.service_id
  enable_fips_ssl_policy = var.enable_fips_ssl_policy
  tls_min_version        = var.tls_min_version
  labels                 = var.labels
}

module "dns" {
  source              = "./modules/dns"
  project_id          = var.project_id
  dns_name            = "${var.domain_name}."
  managed_zone_name   = var.dns_managed_zone_name
  create_managed_zone = var.create_dns_zone
  address             = module.lb.public_ip
}
