variable "project_id" { type = string }
variable "location" { type = string }
variable "bucket_id" { type = string }
variable "retention_days" { type = number }
variable "kms_key_name" { type = string }
variable "labels" { type = map(string) }
