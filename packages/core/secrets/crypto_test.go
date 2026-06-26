package secrets

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}
	plain := []byte(`{"secret_key":"sk_test_1234"}`)
	enc, err := Encrypt(key, plain)
	require.NoError(t, err)
	assert.NotContains(t, enc, "sk_test")

	out, err := Decrypt(key, enc)
	require.NoError(t, err)
	assert.Equal(t, plain, out)
}

func TestMaskLast4(t *testing.T) {
	assert.Equal(t, "", MaskLast4(""))
	assert.Equal(t, "abcd", MaskLast4("abcd"))
	assert.Equal(t, "wxyz", MaskLast4("sk_live_wxyz"))
}
