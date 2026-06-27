package support

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateValidation(t *testing.T) {
	svc := NewService(nil)

	_, err := svc.Create(context.Background(), "", "message")
	assert.ErrorIs(t, err, ErrSubjectRequired)

	_, err = svc.Create(context.Background(), "subject", "   ")
	assert.ErrorIs(t, err, ErrMessageRequired)
}
