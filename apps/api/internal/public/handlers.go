package public

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

type contactRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Company   string `json:"company"`
	Inquiry   string `json:"inquiry"`
	Message   string `json:"message"`
}

// ContactHandler accepts marketing contact form submissions (stub — no email send yet).
func ContactHandler(appCfg *config.AppConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req contactRequest
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(400, "invalid body")
		}

		req.FirstName = strings.TrimSpace(req.FirstName)
		req.LastName = strings.TrimSpace(req.LastName)
		req.Email = strings.TrimSpace(req.Email)
		req.Company = strings.TrimSpace(req.Company)
		req.Inquiry = strings.TrimSpace(req.Inquiry)
		req.Message = strings.TrimSpace(req.Message)

		if req.FirstName == "" || req.LastName == "" {
			return fiber.NewError(400, "first and last name are required")
		}
		if req.Email == "" || !strings.Contains(req.Email, "@") {
			return fiber.NewError(400, "valid email is required")
		}
		if req.Company == "" {
			return fiber.NewError(400, "company is required")
		}
		if req.Inquiry == "" {
			return fiber.NewError(400, "inquiry type is required")
		}
		if req.Message == "" {
			return fiber.NewError(400, "message is required")
		}

		refID := uuid.NewString()
		if skipEmail, ok := appCfg.Debug.Features["skip_email_send"].(bool); ok && skipEmail {
			log.Printf("contact form stub (skip_email_send): ref=%s email=%s inquiry=%s company=%s",
				refID, req.Email, req.Inquiry, req.Company)
		}

		return c.Status(201).JSON(fiber.Map{
			"ok":         true,
			"reference_id": refID,
		})
	}
}

// MarketingContentHandler serves blog listings and case studies from config/marketing-content.yaml.
func MarketingContentHandler(root string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		path := filepath.Join(root, "config", "marketing-content.yaml")
		data, err := os.ReadFile(path)
		if err != nil {
			return c.JSON(fiber.Map{
				"blog":          fiber.Map{"posts": []any{}},
				"case_studies":  fiber.Map{},
			})
		}

		var payload map[string]interface{}
		if err := yaml.Unmarshal(data, &payload); err != nil {
			return fiber.NewError(500, "invalid marketing content")
		}
		return c.JSON(payload)
	}
}
