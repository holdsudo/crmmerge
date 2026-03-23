output "instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "database_name" {
  value = google_sql_database.app.name
}

output "username" {
  value = google_sql_user.app.name
}

output "password" {
  value     = random_password.app.result
  sensitive = true
}
