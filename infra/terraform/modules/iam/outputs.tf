output "runtime_service_account_email" {
  value = google_service_account.runtime.email
}

output "deployer_service_account_email" {
  value = google_service_account.deployer.email
}

output "key_admin_service_account_email" {
  value = google_service_account.key_admin.email
}
