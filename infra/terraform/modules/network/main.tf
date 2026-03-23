resource "google_compute_network" "crm" {
  name                    = "crm-prod-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "crm" {
  name                     = "crm-prod-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.crm.id
  ip_cidr_range            = "10.20.0.0/24"
  private_ip_google_access = true
}

resource "google_compute_global_address" "private_service_range" {
  name          = "crm-private-service-range"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.crm.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.crm.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

resource "google_vpc_access_connector" "run" {
  name          = "crm-run-connector"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.crm.name
  ip_cidr_range = "10.21.0.0/28"
}
