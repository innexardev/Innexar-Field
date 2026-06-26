package response

import "github.com/gofiber/fiber/v2"

// NilToEmpty returns a non-nil empty slice when items is nil so JSON encodes [] not null.
func NilToEmpty[T any](items []T) []T {
	if items == nil {
		return make([]T, 0)
	}
	return items
}

// DataList writes {"data": [...]} with an empty array when items is nil.
func DataList[T any](c *fiber.Ctx, items []T) error {
	return c.JSON(fiber.Map{"data": NilToEmpty(items)})
}

// DataListWith writes {"data": [...], ...extra} with an empty array when items is nil.
func DataListWith[T any](c *fiber.Ctx, items []T, extra fiber.Map) error {
	body := fiber.Map{"data": NilToEmpty(items)}
	for k, v := range extra {
		body[k] = v
	}
	return c.JSON(body)
}
