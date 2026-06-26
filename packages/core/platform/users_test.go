package platform

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateUserRole(t *testing.T) {
	assert.NoError(t, validateUserRole("owner"))
	assert.NoError(t, validateUserRole("admin"))
	assert.NoError(t, validateUserRole("field-tech"))
	err := validateUserRole("super_admin")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid role")
}

func TestValidateSubscriptionStatus(t *testing.T) {
	assert.NoError(t, validateSubscriptionStatus("active"))
	assert.NoError(t, validateSubscriptionStatus("trialing"))
	err := validateSubscriptionStatus("suspended")
	require.Error(t, err)
}
