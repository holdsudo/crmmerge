variable "project_id" { type = string }
variable "labels" { type = map(string) }
variable "kms_keys" { type = map(string) }
variable "secret_names" { type = list(string) }
