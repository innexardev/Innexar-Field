package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIssueCustomerToken(t *testing.T) {
	svc := NewService("test-secret-at-least-32-chars-long", 24)
	token, err := svc.IssueCustomerToken("cust-1", "tenant-1", "client@example.com")
	require.NoError(t, err)

	claims, err := svc.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, "customer", claims.Role)
	assert.Equal(t, "cust-1", claims.CustomerID)
	assert.Equal(t, "cust-1", claims.UserID)
	assert.Equal(t, "tenant-1", claims.TenantID)
	assert.Equal(t, "client@example.com", claims.Email)
}
