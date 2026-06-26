package estimating

import (
	"encoding/csv"
	"fmt"
	"math"
	"strconv"
	"strings"
)

type priceBookCSVRow struct {
	Name           string
	Category       string
	Unit           string
	UnitPriceCents int64
}

func parsePriceBookCSV(content string) ([]priceBookCSVRow, int, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, 0, fmt.Errorf("csv_content is empty")
	}

	reader := csv.NewReader(strings.NewReader(content))
	reader.TrimLeadingSpace = true
	records, err := reader.ReadAll()
	if err != nil {
		return nil, 0, fmt.Errorf("invalid CSV: %w", err)
	}
	if len(records) < 2 {
		return nil, 0, fmt.Errorf("CSV must include a header row and at least one data row")
	}

	colIndex := mapPriceBookColumns(records[0])
	if _, ok := colIndex["name"]; !ok {
		return nil, 0, fmt.Errorf("CSV header must include a name column")
	}
	if _, ok := colIndex["unit_price"]; !ok {
		return nil, 0, fmt.Errorf("CSV header must include a unit_price column")
	}

	var items []priceBookCSVRow
	skipped := 0
	for _, record := range records[1:] {
		if len(strings.TrimSpace(strings.Join(record, ""))) == 0 {
			continue
		}
		item, err := parsePriceBookRecord(record, colIndex)
		if err != nil {
			skipped++
			continue
		}
		items = append(items, item)
	}
	return items, skipped, nil
}

func mapPriceBookColumns(header []string) map[string]int {
	index := make(map[string]int)
	for i, col := range header {
		key := strings.ToLower(strings.TrimSpace(col))
		key = strings.ReplaceAll(key, " ", "_")
		index[key] = i
	}
	return index
}

func parsePriceBookRecord(record []string, colIndex map[string]int) (priceBookCSVRow, error) {
	name := fieldAt(record, colIndex, "name")
	if name == "" {
		return priceBookCSVRow{}, fmt.Errorf("name required")
	}

	priceRaw := fieldAt(record, colIndex, "unit_price")
	price, err := strconv.ParseFloat(priceRaw, 64)
	if err != nil || price < 0 {
		return priceBookCSVRow{}, fmt.Errorf("invalid unit_price")
	}

	category := fieldAt(record, colIndex, "category")
	if category == "" {
		category = "service"
	}
	unit := fieldAt(record, colIndex, "unit")
	if unit == "" {
		unit = "each"
	}

	return priceBookCSVRow{
		Name:           name,
		Category:       category,
		Unit:           unit,
		UnitPriceCents: int64(math.Round(price * 100)),
	}, nil
}

func fieldAt(record []string, colIndex map[string]int, column string) string {
	idx, ok := colIndex[column]
	if !ok || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}
