variable "project_id" { type = string }
variable "region" { type = string }
variable "domain_name" { type = string }
variable "cloud_run_service_name" { type = string }
variable "cloud_run_service_id" { type = string }
variable "enable_fips_ssl_policy" { type = bool }
variable "tls_min_version" { type = string }
variable "labels" { type = map(string) }
