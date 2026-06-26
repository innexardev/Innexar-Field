package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	hash, err := HashPassword("secret123")
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NoError(t, CheckPassword(hash, "secret123"))
	assert.Error(t, CheckPassword(hash, "wrong"))
}

func TestIssueAndParseToken(t *testing.T) {
	svc := NewService("test-secret-key-32-characters!!", 24)
	token, err := svc.IssueToken("user-1", "tenant-1", "a@b.com", "owner")
	require.NoError(t, err)

	claims, err := svc.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, "user-1", claims.UserID)
	assert.Equal(t, "tenant-1", claims.TenantID)
	assert.Equal(t, "owner", claims.Role)
}

func TestIssueAndParsePlatformToken(t *testing.T) {
	svc := NewService("test-secret-key-32-characters!!", 24)
	token, err := svc.IssuePlatformToken("admin-1", "admin@fieldforge.com")
	require.NoError(t, err)

	claims, err := svc.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, "admin-1", claims.UserID)
	assert.True(t, claims.IsPlatformAdmin)
	assert.Equal(t, "super_admin", claims.Role)
	assert.Empty(t, claims.TenantID)
}
