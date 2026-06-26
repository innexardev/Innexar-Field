package storage

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUploadLogo_mockMode(t *testing.T) {
	svc := NewService(Config{Mock: true})
	png := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}

	result, err := svc.UploadLogo(context.Background(), "tenant-1", png)
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(result.LogoURL, "data:image/png;base64,"))
}

func TestUploadLogo_localFallback(t *testing.T) {
	dir := t.TempDir()
	svc := NewService(Config{
		LocalDir:       dir,
		LocalPublicURL: "http://localhost:8081/uploads",
	})

	png := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
	result, err := svc.UploadLogo(context.Background(), "tenant-abc", png)
	require.NoError(t, err)
	assert.Contains(t, result.LogoURL, "tenants/tenant-abc/logo/")
	assert.Contains(t, result.LogoURL, ".png")

	matches, err := filepath.Glob(filepath.Join(dir, "tenants", "tenant-abc", "logo", "*.png"))
	require.NoError(t, err)
	assert.Len(t, matches, 1)
}

func TestUploadLogo_requiresTenant(t *testing.T) {
	svc := NewService(Config{Mock: true})
	_, err := svc.UploadLogo(context.Background(), "", []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})
	assert.ErrorIs(t, err, ErrLogoTenantMissing)
}

func TestUploadLogo_rejectsInvalidMime(t *testing.T) {
	svc := NewService(Config{Mock: true})
	_, err := svc.UploadLogo(context.Background(), "tenant-1", []byte("plain-text"))
	assert.ErrorIs(t, err, ErrLogoInvalidType)
}

func TestLoadConfigFromEnv_defaults(t *testing.T) {
	t.Setenv("R2_MOCK", "")
	t.Setenv("UPLOAD_LOCAL_DIR", "")
	t.Setenv("UPLOAD_LOCAL_PUBLIC_URL", "")
	t.Setenv("PORT", "9090")

	cfg := LoadConfigFromEnv()
	assert.Equal(t, "uploads", cfg.LocalDir)
	assert.Equal(t, "http://localhost:9090/uploads", cfg.LocalPublicURL)
	assert.False(t, cfg.R2Configured())
	assert.True(t, cfg.UseLocal())
}

func TestUploadLogo_noStorageConfigured(t *testing.T) {
	svc := NewService(Config{})
	_, err := svc.UploadLogo(context.Background(), "tenant-1", []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})
	assert.Error(t, err)
}

func TestUploadLogo_localCreatesDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "uploads")
	svc := NewService(Config{LocalDir: dir, LocalPublicURL: "http://test/uploads"})
	png := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02}

	_, err := svc.UploadLogo(context.Background(), "t1", png)
	require.NoError(t, err)
	_, err = os.Stat(filepath.Join(dir, "tenants", "t1", "logo"))
	require.NoError(t, err)
}
