package documents

import (
	"github.com/fieldforge/fieldforge/packages/core/config"
)

// Brand holds printable document identity from app config.
type Brand struct {
	Name      string
	LegalName string
	Tagline   string
	Colors    map[string]string
	FontSans  string
}

// BrandFromConfig extracts document branding from the central app config.
func BrandFromConfig(cfg *config.AppConfig) Brand {
	if cfg == nil {
		return Brand{
			Name:   "FieldForge",
			Colors: defaultColors(),
		}
	}

	brand := Brand{
		Name:      stringField(cfg.Brand, "name", "FieldForge"),
		LegalName: stringField(cfg.Brand, "legal_name", ""),
		Tagline:   stringField(cfg.Brand, "tagline", ""),
		Colors:    defaultColors(),
	}
	if brand.LegalName == "" {
		brand.LegalName = brand.Name
	}

	if colors, ok := cfg.Brand["colors"].(map[string]interface{}); ok {
		for key, val := range colors {
			if s, ok := val.(string); ok && s != "" {
				brand.Colors[key] = s
			}
		}
	}
	if typo, ok := cfg.Brand["typography"].(map[string]interface{}); ok {
		brand.FontSans = stringField(typo, "font_sans", "Inter, system-ui, sans-serif")
	}
	if brand.FontSans == "" {
		brand.FontSans = "Inter, system-ui, sans-serif"
	}
	return brand
}

func stringField(m map[string]interface{}, key, fallback string) string {
	if m == nil {
		return fallback
	}
	if v, ok := m[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

func defaultColors() map[string]string {
	return map[string]string{
		"primary":           "#0F172A",
		"primary_foreground": "#F8FAFC",
		"accent":            "#2563EB",
		"background":        "#FFFFFF",
		"surface_elevated":  "#F1F5F9",
		"border":            "#E2E8F0",
		"text_primary":      "#0F172A",
		"text_secondary":    "#475569",
		"text_muted":        "#94A3B8",
		"success":           "#059669",
	}
}

func (b Brand) color(key, fallback string) string {
	if v := b.Colors[key]; v != "" {
		return v
	}
	return fallback
}
