resource "google_kms_key_ring" "regulated" {
  name     = "regulated-data"
  location = var.location
  project  = var.project_id
}

resource "google_kms_crypto_key" "keys" {
  for_each        = var.keys
  name            = each.key
  key_ring        = google_kms_key_ring.regulated.id
  rotation_period = var.key_rotation
  labels          = var.labels

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = each.value.protection_level
  }

  lifecycle {
    prevent_destroy = true
  }
}
