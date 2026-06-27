package integrations

import (
	"fmt"

	"github.com/fieldforge/fieldforge/packages/core/secrets"
)

const (
	metaAccessTokenEnc  = "access_token_encrypted"
	metaRefreshTokenEnc = "refresh_token_encrypted"
)

func encryptToken(value string) (string, error) {
	if value == "" {
		return "", nil
	}
	key, err := secrets.KeyFromEnv()
	if err != nil {
		return "", fmt.Errorf("token encryption key: %w", err)
	}
	return secrets.Encrypt(key, []byte(value))
}

func decryptToken(encoded string) (string, error) {
	if encoded == "" {
		return "", nil
	}
	key, err := secrets.KeyFromEnv()
	if err != nil {
		return "", fmt.Errorf("token encryption key: %w", err)
	}
	plain, err := secrets.Decrypt(key, encoded)
	if err != nil {
		return "", fmt.Errorf("decrypt token: %w", err)
	}
	return string(plain), nil
}

func sanitizeConnectionStatus(st ConnectionStatus) ConnectionStatus {
	st.Metadata = sanitizeConnectionMetadata(st.Metadata)
	return st
}

func sanitizeConnectionStatuses(list []ConnectionStatus) []ConnectionStatus {
	out := make([]ConnectionStatus, len(list))
	for i, st := range list {
		out[i] = sanitizeConnectionStatus(st)
	}
	return out
}

func sanitizeConnectionMetadata(metadata map[string]interface{}) map[string]interface{} {
	if metadata == nil {
		return map[string]interface{}{}
	}
	out := make(map[string]interface{}, len(metadata))
	for k, v := range metadata {
		switch k {
		case metaAccessTokenEnc, metaRefreshTokenEnc, metaAuthTokenEnc, "oauth_state", "redirect_uri":
			continue
		default:
			out[k] = v
		}
	}
	if metadata[metaAccessTokenEnc] != nil && metadata[metaAccessTokenEnc] != "" {
		out["tokens_stored"] = true
	}
	if metadata[metaAuthTokenEnc] != nil && metadata[metaAuthTokenEnc] != "" {
		out["auth_token_stored"] = true
	}
	return out
}
