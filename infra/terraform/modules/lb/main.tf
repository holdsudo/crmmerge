locals {
  # Google SSL policies do not expose a literal FIPS profile switch.
  # This custom AES-GCM ECDHE list is the safest reasonable frontend policy available in GCLB.
  fips_oriented_ciphers = [
    "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
  ]
}

resource "google_compute_global_address" "lb_ip" {
  project = var.project_id
  name    = "crm-lb-ip"
}

resource "google_compute_region_network_endpoint_group" "serverless" {
  project               = var.project_id
  name                  = "crm-serverless-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = var.cloud_run_service_name
  }
}

resource "google_compute_backend_service" "app" {
  project               = var.project_id
  name                  = "crm-backend"
  protocol              = "HTTPS"
  port_name             = "https"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  enable_cdn            = false

  backend {
    group = google_compute_region_network_endpoint_group.serverless.id
  }

  custom_request_headers = ["X-Forwarded-Proto:https"]
}

resource "google_compute_ssl_policy" "strict" {
  project         = var.project_id
  name            = "crm-ssl-policy"
  min_tls_version = var.tls_min_version
  profile         = var.enable_fips_ssl_policy ? "CUSTOM" : "RESTRICTED"
  custom_features = var.enable_fips_ssl_policy ? local.fips_oriented_ciphers : null
}

resource "google_compute_managed_ssl_certificate" "cert" {
  project = var.project_id
  name    = "crm-managed-cert"

  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_url_map" "https" {
  project         = var.project_id
  name            = "crm-https-map"
  default_service = google_compute_backend_service.app.id
}

resource "google_compute_target_https_proxy" "https" {
  project          = var.project_id
  name             = "crm-https-proxy"
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.cert.id]
  ssl_policy       = google_compute_ssl_policy.strict.id
}

resource "google_compute_url_map" "http_redirect" {
  project = var.project_id
  name    = "crm-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http" {
  project = var.project_id
  name    = "crm-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = "crm-https-fr"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb_ip.id
  port_range            = "443"
  target                = google_compute_target_https_proxy.https.id
}

resource "google_compute_global_forwarding_rule" "http" {
  project               = var.project_id
  name                  = "crm-http-fr"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb_ip.id
  port_range            = "80"
  target                = google_compute_target_http_proxy.http.id
}
