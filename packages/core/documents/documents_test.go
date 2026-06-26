package documents

import (
	"strings"
	"testing"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/config"
)

func TestRenderInvoiceHTML(t *testing.T) {
	due := time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)
	html := RenderInvoiceHTML(testBrand(), InvoiceData{
		InvoiceNumber: "INV-TEST-001",
		Status:        "sent",
		TotalCents:    12500,
		DueAt:         &due,
		CustomerName:  "Acme Corp",
	})

	for _, want := range []string{
		"INV-TEST-001",
		"Innexar Field",
		"Acme Corp",
		"$125.00",
		"Amount due",
		"#2563EB",
	} {
		if !strings.Contains(html, want) {
			t.Errorf("invoice HTML missing %q", want)
		}
	}
}

func TestRenderEstimateHTML(t *testing.T) {
	html := RenderEstimateHTML(testBrand(), EstimateData{
		Title:         "Office deep clean",
		Status:        "draft",
		SubtotalCents: 10000,
		TotalCents:    10850,
		Lines: []EstimateLine{
			{Description: "Deep clean", Quantity: 1, UnitCents: 10000},
		},
	})

	for _, want := range []string{
		"Office deep clean",
		"Deep clean",
		"$100.00",
		"$108.50",
		"Subtotal",
	} {
		if !strings.Contains(html, want) {
			t.Errorf("estimate HTML missing %q", want)
		}
	}
}

func TestSanitizeFilename(t *testing.T) {
	if got := sanitizeFilename("INV 001/test"); got != "INV_001_test" {
		t.Fatalf("sanitizeFilename = %q", got)
	}
}

func testBrand() Brand {
	return BrandFromConfig(&config.AppConfig{
		Brand: map[string]interface{}{
			"name":       "Innexar Field",
			"legal_name": "Innexar",
			"colors": map[string]interface{}{
				"accent": "#2563EB",
			},
			"typography": map[string]interface{}{
				"font_sans": "Inter, sans-serif",
			},
		},
	})
}
