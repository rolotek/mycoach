# Rotating API_KEY_ENCRYPTION_KEY

User API keys are stored encrypted in `user_api_keys.encrypted_key` using AES-256-GCM. The key is `API_KEY_ENCRYPTION_KEY` (32 bytes, 64 hex chars). To rotate it you must re-encrypt every row with the new key.

## Prerequisites

- Database backup (recommended).
- Access to set env vars and run a one-off migration (script or REPL).

## Steps

### 1. Generate a new key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store the output securely (e.g. secrets manager). This will become the new `API_KEY_ENCRYPTION_KEY`.

### 2. Re-encrypt all existing keys

Every row in `user_api_keys` must be decrypted with the **current** key and re-encrypted with the **new** key. Options:

**Option A – One-off script (recommended)**  
Write a small script that:

1. Reads `API_KEY_ENCRYPTION_KEY` (current) and `API_KEY_ENCRYPTION_KEY_NEW` from env.
2. Connects to the DB, selects all rows from `user_api_keys`.
3. For each row: `plaintext = decrypt(row.encrypted_key)` using current key, then `newCipher = encryptWithKey(plaintext, newKey)`.
4. Updates the row: `UPDATE user_api_keys SET encrypted_key = $newCipher WHERE id = $id`.
5. Runs in a transaction so you can roll back on error.

**Option B – REPL / ad-hoc**  
In a Node REPL with DB and crypto wired up: load all rows, for each decrypt with current key and encrypt with new key (using a temporary `encryptWithKey(plaintext, newKeyBuffer)`), then batch-update.

### 3. Deploy with the new key only

- Set `API_KEY_ENCRYPTION_KEY` to the new value (64 hex chars) in your deployment env.
- Remove any temporary `API_KEY_ENCRYPTION_KEY_NEW` or backup of the old key from env (keep the old key in secure backup only if you need to restore old ciphertexts from backup).

### 4. Verify

- Trigger a flow that uses a stored API key (e.g. Settings → verify key, or send a chat that uses a provider). Confirm no decrypt errors in logs.

## Downtime

With the current single-key design, rotation requires a brief window where the migration runs **before** switching the app to the new key: run the re-encrypt script while the app still uses the old key, then deploy with the new key. During the script run, avoid writing new API keys (or run during low traffic); reads continue to use the old key until deploy.

## Future: zero-downtime rotation

To rotate with no downtime, the format could support a key version (e.g. `v1:iv:authTag:ciphertext`). On read: try decrypt with current key; if format is `v0` or decrypt fails, try legacy key and if successful re-encrypt with current key and update the row. Then run a background job to re-encrypt all `v0` rows, and eventually stop supporting the old key.
