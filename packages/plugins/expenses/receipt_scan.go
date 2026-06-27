package expenses

import (
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/storage"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type ReceiptScanResult struct {
	Description string  `json:"description"`
	AmountCents int64   `json:"amount_cents"`
	Category    string  `json:"category"`
	Filename    string  `json:"filename,omitempty"`
	Confidence  float64 `json:"confidence"`
	OCRStub     bool    `json:"ocr_stub"`
}

var amountPattern = regexp.MustCompile(`(\d+[.,]\d{2})`)

func (p *Plugin) scanReceipt(c *fiber.Ctx) error {
	_, ok := tenant.ID(c.UserContext())
	if !ok {
		return fiber.NewError(fiber.StatusUnauthorized, "missing tenant context")
	}

	file, err := c.FormFile("receipt")
	if err != nil {
		return fiber.NewError(400, "receipt file required")
	}
	if file.Size > storage.MaxPhotoBytes {
		return fiber.NewError(400, "receipt file too large")
	}

	f, err := file.Open()
	if err != nil {
		return fiber.NewError(400, "failed to read receipt")
	}
	defer f.Close()

	data := make([]byte, file.Size)
	if _, err := f.Read(data); err != nil {
		return fiber.NewError(400, "failed to read receipt")
	}
	if _, _, err := storage.ValidatePhoto(data); err != nil {
		return fiber.NewError(400, "invalid receipt image")
	}

	result := categorizeReceipt(file.Filename)
	return c.JSON(result)
}

func categorizeReceipt(filename string) ReceiptScanResult {
	base := strings.ToLower(filepath.Base(filename))
	name := strings.TrimSuffix(base, filepath.Ext(base))
	name = strings.ReplaceAll(name, "_", " ")
	name = strings.ReplaceAll(name, "-", " ")

	category := "general"
	description := "Receipt upload"
	confidence := 0.55

	switch {
	case containsAny(name, "fuel", "gas", "shell", "chevron", "exxon"):
		category = "fuel"
		description = "Fuel receipt"
		confidence = 0.72
	case containsAny(name, "hotel", "lodging", "airbnb", "marriott"):
		category = "lodging"
		description = "Lodging receipt"
		confidence = 0.7
	case containsAny(name, "meal", "food", "restaurant", "lunch", "dinner", "coffee", "starbucks"):
		category = "meals"
		description = "Meals receipt"
		confidence = 0.68
	case containsAny(name, "supply", "home depot", "lowes", "material", "parts"):
		category = "materials"
		description = "Materials receipt"
		confidence = 0.66
	case containsAny(name, "parking", "toll"):
		category = "travel"
		description = "Travel receipt"
		confidence = 0.65
	}

	amountCents := int64(0)
	if match := amountPattern.FindStringSubmatch(name); len(match) > 1 {
		normalized := strings.ReplaceAll(match[1], ",", ".")
		if v, err := strconv.ParseFloat(normalized, 64); err == nil && v > 0 {
			amountCents = int64(v * 100)
			confidence += 0.1
		}
	}
	if description == "Receipt upload" && name != "" {
		description = strings.ToUpper(name[:1]) + name[1:]
	}

	return ReceiptScanResult{
		Description: description,
		AmountCents: amountCents,
		Category:    category,
		Filename:    filename,
		Confidence:  confidence,
		OCRStub:     true,
	}
}

func containsAny(text string, terms ...string) bool {
	for _, term := range terms {
		if strings.Contains(text, term) {
			return true
		}
	}
	return false
}
