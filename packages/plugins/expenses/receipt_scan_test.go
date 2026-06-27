package expenses

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCategorizeReceiptFuel(t *testing.T) {
	result := categorizeReceipt("shell-gas-45.00.jpg")
	assert.Equal(t, "fuel", result.Category)
	assert.Equal(t, int64(4500), result.AmountCents)
	assert.True(t, result.OCRStub)
}
