package platform

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateSuperAdmin_Validation(t *testing.T) {
	_, err := CreateSuperAdmin(context.Background(), nil, "", "password")
	assert.Error(t, err)

	_, err = CreateSuperAdmin(context.Background(), nil, "admin@fieldforge.com", "")
	assert.Error(t, err)
}
