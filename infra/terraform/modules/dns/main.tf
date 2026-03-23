resource "google_dns_managed_zone" "zone" {
  count       = var.create_managed_zone ? 1 : 0
  project     = var.project_id
  name        = var.managed_zone_name
  dns_name    = var.dns_name
  description = "Managed zone for the regulated CRM."
}

resource "google_dns_record_set" "root_a" {
  project      = var.project_id
  managed_zone = var.managed_zone_name
  name         = var.dns_name
  type         = "A"
  ttl          = 300
  rrdatas      = [var.address]
}
