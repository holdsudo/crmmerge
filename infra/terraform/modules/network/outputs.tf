output "vpc_self_link" {
  value = google_compute_network.crm.self_link
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.run.id
}
