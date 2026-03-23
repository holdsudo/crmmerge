variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Primary region for regional services."
  type        = string
  default     = "us-east1"
}

variable "billing_region" {
  description = "Region for KMS and logging resources when different from app region."
  type        = string
  default     = "us-east1"
}

variable "domain_name" {
  description = "Primary production domain name."
  type        = string
}

variable "dns_managed_zone_name" {
  description = "Cloud DNS managed zone name."
  type        = string
}

variable "create_dns_zone" {
  description = "Whether Terraform should create the DNS managed zone."
  type        = bool
  default     = false
}

variable "web_service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "dealership-vendor-crm"
}

variable "artifact_repository_name" {
  description = "Artifact Registry repository name."
  type        = string
  default     = "dealership-vendor-crm"
}

variable "sql_instance_name" {
  description = "Cloud SQL instance name."
  type        = string
  default     = "dealership-vendor-crm-db"
}

variable "sql_database_name" {
  description = "Application database name."
  type        = string
  default     = "dealership_vendor_crm"
}

variable "sql_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-8192"
}

variable "document_bucket_name" {
  description = "Cloud Storage bucket for regulated documents."
  type        = string
}

variable "log_bucket_name" {
  description = "Dedicated CMEK-backed Cloud Logging bucket name."
  type        = string
  default     = "regulated-audit-logs"
}

variable "runtime_secret_names" {
  description = "Secret Manager secret IDs provisioned for runtime."
  type        = list(string)
  default = [
    "session-secret",
    "app-encryption-key",
    "database-url",
    "seed-admin-password",
    "seed-manager-password",
    "seed-staff-password"
  ]
}

variable "labels" {
  description = "Labels applied to supported resources."
  type        = map(string)
  default = {
    app         = "dealership-vendor-crm"
    environment = "prod"
    compliance  = "njdobi-oriented"
  }
}

variable "enable_fips_ssl_policy" {
  description = "Use a FIPS-oriented custom SSL policy."
  type        = bool
  default     = true
}

variable "tls_min_version" {
  description = "Minimum TLS version for the external load balancer."
  type        = string
  default     = "TLS_1_2"
}

variable "log_retention_days" {
  description = "Retention for CMEK-backed audit log bucket."
  type        = number
  default     = 365
}

variable "contract_retention_days" {
  description = "Retention for regulated documents."
  type        = number
  default     = 365
}

variable "sql_backup_retention_count" {
  description = "Number of retained Cloud SQL backups."
  type        = number
  default     = 14
}
