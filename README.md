# Encrypted static mirror

Every page in this repository is ciphertext. Page bodies are encrypted with
AES-256-GCM under a key derived by PBKDF2-HMAC-SHA256 (600,000 iterations, a
fresh random salt and nonce per file), and decrypted in the browser after the
reader enters the passphrase. No page content is stored here in the clear, and
the passphrase is not in this repository, its history, or its settings.

Only the stylesheet and a small behaviour script are plaintext. Both were
audited to carry presentation and nothing else: no data literals, no network
calls, no identifiers.

The pages require a secure context, so open them over HTTPS.
