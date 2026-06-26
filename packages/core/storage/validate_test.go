package storage

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateLogo_acceptsPNG(t *testing.T) {
	data := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
	contentType, ext, err := ValidateLogo(data)
	require.NoError(t, err)
	assert.Equal(t, "image/png", contentType)
	assert.Equal(t, "png", ext)
}

func TestValidateLogo_acceptsJPEG(t *testing.T) {
	data := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10}
	contentType, ext, err := ValidateLogo(data)
	require.NoError(t, err)
	assert.Equal(t, "image/jpeg", contentType)
	assert.Equal(t, "jpg", ext)
}

func TestValidateLogo_acceptsWebP(t *testing.T) {
	data := []byte("RIFF\x00\x00\x00\x00WEBP")
	contentType, ext, err := ValidateLogo(data)
	require.NoError(t, err)
	assert.Equal(t, "image/webp", contentType)
	assert.Equal(t, "webp", ext)
}

func TestValidateLogo_rejectsTooLarge(t *testing.T) {
	data := make([]byte, MaxLogoBytes+1)
	data[0] = 0x89
	data[1] = 0x50
	_, _, err := ValidateLogo(data)
	assert.ErrorIs(t, err, ErrLogoTooLarge)
}

func TestValidateLogo_rejectsInvalidType(t *testing.T) {
	_, _, err := ValidateLogo([]byte("not-an-image"))
	assert.ErrorIs(t, err, ErrLogoInvalidType)
}

func TestValidateLogo_rejectsGIF(t *testing.T) {
	data := []byte("GIF89a")
	_, _, err := ValidateLogo(data)
	assert.ErrorIs(t, err, ErrLogoInvalidType)
}

func TestLogoObjectKey_scopesByTenant(t *testing.T) {
	key := LogoObjectKey("tenant-a", "obj-1", "png")
	assert.Equal(t, "tenants/tenant-a/logo/obj-1.png", key)
}

func TestPhotoObjectKey_scopesByTenantAndEntity(t *testing.T) {
	key := PhotoObjectKey("tenant-a", "cleaning/qc", "job-1", "obj-1", "jpg")
	assert.Equal(t, "tenants/tenant-a/cleaning/qc/job-1/obj-1.jpg", key)
}

func TestValidatePhoto_acceptsPNG(t *testing.T) {
	data := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
	contentType, ext, err := ValidatePhoto(data)
	require.NoError(t, err)
	assert.Equal(t, "image/png", contentType)
	assert.Equal(t, "png", ext)
}

func TestValidatePhoto_rejectsTooLarge(t *testing.T) {
	data := make([]byte, MaxPhotoBytes+1)
	data[0] = 0x89
	data[1] = 0x50
	_, _, err := ValidatePhoto(data)
	assert.ErrorIs(t, err, ErrPhotoTooLarge)
}
