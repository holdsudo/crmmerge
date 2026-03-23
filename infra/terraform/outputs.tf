output "load_balancer_ip" {
  description = "Public IP for the external HTTPS load balancer."
  value       = module.lb.public_ip
}

output "cloud_run_service" {
  description = "Cloud Run service name."
  value       = module.run.service_name
}

output "cloud_sql_instance_connection_name" {
  description = "Cloud SQL instance connection name."
  value       = module.sql.instance_connection_name
}

output "kms_keys" {
  description = "KMS key resource IDs."
  value       = module.kms.key_ids
}

output "artifact_repository" {
  description = "Artifact Registry repository path."
  value       = module.artifact_registry.repository
}
