output "key_ids" {
  value = { for k, v in google_kms_crypto_key.keys : k => v.id }
}
