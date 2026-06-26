package reports

import "testing"

func TestFormatCents(t *testing.T) {
	tests := []struct {
		cents int64
		want  string
	}{
		{0, "$0.00"},
		{99, "$0.99"},
		{100, "$1.00"},
		{4280000, "$42,800.00"},
		{-150, "-$1.50"},
	}
	for _, tc := range tests {
		if got := formatCents(tc.cents); got != tc.want {
			t.Errorf("formatCents(%d) = %q, want %q", tc.cents, got, tc.want)
		}
	}
}

func TestTenantMetricsHasLiveData(t *testing.T) {
	if (TenantMetrics{}).HasLiveData() {
		t.Fatal("empty metrics should not be live")
	}
	m := TenantMetrics{Customers: 1}
	if !m.HasLiveData() {
		t.Fatal("customer count should mark metrics as live")
	}
}

func TestCommaThousands(t *testing.T) {
	if got := commaThousands(1234567); got != "1,234,567" {
		t.Fatalf("commaThousands = %q", got)
	}
}
