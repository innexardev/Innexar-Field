package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
)

// KeyFromEnv returns a 32-byte AES key from PLATFORM_SETTINGS_KEY or JWT_SECRET.
func KeyFromEnv() ([]byte, error) {
	raw := os.Getenv("PLATFORM_SETTINGS_KEY")
	if raw == "" {
		raw = os.Getenv("JWT_SECRET")
	}
	if len(raw) < 32 {
		return nil, errors.New("PLATFORM_SETTINGS_KEY or JWT_SECRET must be at least 32 characters")
	}
	sum := sha256.Sum256([]byte(raw))
	return sum[:], nil
}

// Encrypt encodes plaintext with AES-256-GCM; output is base64(nonce|ciphertext).
func Encrypt(key []byte, plaintext []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("aes cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm: %w", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce: %w", err)
	}
	sealed := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses Encrypt.
func Decrypt(key []byte, encoded string) ([]byte, error) {
	sealed, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("decode ciphertext: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm: %w", err)
	}
	if len(sealed) < gcm.NonceSize() {
		return nil, errors.New("ciphertext too short")
	}
	nonce, ciphertext := sealed[:gcm.NonceSize()], sealed[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decrypt: %w", err)
	}
	return plain, nil
}

// MaskLast4 returns a masked preview for API responses (last 4 chars only).
func MaskLast4(value string) string {
	if value == "" {
		return ""
	}
	if len(value) <= 4 {
		return value
	}
	return value[len(value)-4:]
}
