package documents

import "testing"

func TestFormatCents(t *testing.T) {
	tests := []struct {
		cents int64
		want  string
	}{
		{0, "$0.00"},
		{99, "$0.99"},
		{100, "$1.00"},
		{12500, "$125.00"},
		{1234567, "$12,345.67"},
		{-500, "-$5.00"},
	}
	for _, tc := range tests {
		if got := FormatCents(tc.cents); got != tc.want {
			t.Errorf("FormatCents(%d) = %q, want %q", tc.cents, got, tc.want)
		}
	}
}
