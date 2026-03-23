variable "project_id" { type = string }
variable "location" { type = string }
variable "key_rotation" { type = string }
variable "labels" { type = map(string) }
variable "keys" {
  type = map(object({
    protection_level = string
  }))
}
