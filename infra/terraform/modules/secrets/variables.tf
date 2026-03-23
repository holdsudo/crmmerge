variable "project_id" { type = string }
variable "region" { type = string }
variable "secret_ids" { type = list(string) }
variable "kms_key_name" { type = string }
variable "labels" { type = map(string) }
variable "runtime_service_acct" { type = string }
