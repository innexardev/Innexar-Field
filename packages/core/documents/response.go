package documents

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var unsafeFilename = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

// SendHTMLAttachment writes branded HTML with Content-Disposition attachment.
func SendHTMLAttachment(c *fiber.Ctx, filename, html string) error {
	safe := sanitizeFilename(filename)
	if !strings.HasSuffix(strings.ToLower(safe), ".html") {
		safe += ".html"
	}
	c.Set("Content-Type", "text/html; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, safe))
	return c.SendString(html)
}

func sanitizeFilename(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "document"
	}
	return unsafeFilename.ReplaceAllString(name, "_")
}
