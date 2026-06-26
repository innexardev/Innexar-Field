package storage

import (
	"bytes"
	"errors"
	"fmt"
)

const MaxLogoBytes = 2 * 1024 * 1024

var (
	ErrLogoTooLarge      = errors.New("logo must be 2MB or smaller")
	ErrLogoInvalidType   = errors.New("logo must be PNG, JPEG, or WebP")
	ErrLogoEmpty         = errors.New("logo file is empty")
	ErrLogoTenantMissing = errors.New("tenant_id missing from context")
)

// ValidateLogo checks size and image type using magic bytes.
func ValidateLogo(data []byte) (contentType string, ext string, err error) {
	if len(data) == 0 {
		return "", "", ErrLogoEmpty
	}
	if len(data) > MaxLogoBytes {
		return "", "", ErrLogoTooLarge
	}

	contentType, ext, ok := detectLogoType(data)
	if !ok {
		return "", "", ErrLogoInvalidType
	}
	return contentType, ext, nil
}

func detectLogoType(data []byte) (contentType string, ext string, ok bool) {
	switch {
	case len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}):
		return "image/png", "png", true
	case len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF:
		return "image/jpeg", "jpg", true
	case len(data) >= 12 && bytes.Equal(data[0:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")):
		return "image/webp", "webp", true
	default:
		return "", "", false
	}
}

// LogoObjectKey returns the R2/local object key for a tenant logo.
func LogoObjectKey(tenantID, objectID, ext string) string {
	return fmt.Sprintf("tenants/%s/logo/%s.%s", tenantID, objectID, ext)
}
