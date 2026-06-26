package public

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/gofiber/fiber/v2"
)

func TestContactHandler_validation(t *testing.T) {
	app := fiber.New()
	appCfg := &config.AppConfig{
		Debug: config.DebugConfig{
			Enabled:  true,
			Features: map[string]interface{}{"skip_email_send": true},
		},
	}
	app.Post("/contact", ContactHandler(appCfg))

	t.Run("missing email", func(t *testing.T) {
		body := bytes.NewBufferString(`{"firstName":"Jane","lastName":"Doe","company":"Acme","inquiry":"demo","message":"Hello"}`)
		req := httptest.NewRequest(http.MethodPost, "/contact", body)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != 400 {
			t.Fatalf("expected 400, got %d", resp.StatusCode)
		}
	})

	t.Run("valid submission", func(t *testing.T) {
		body := bytes.NewBufferString(`{"firstName":"Jane","lastName":"Doe","email":"jane@acme.com","company":"Acme","inquiry":"demo","message":"Hello"}`)
		req := httptest.NewRequest(http.MethodPost, "/contact", body)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != 201 {
			t.Fatalf("expected 201, got %d", resp.StatusCode)
		}

		var out map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			t.Fatal(err)
		}
		if out["ok"] != true {
			t.Fatalf("expected ok=true, got %v", out["ok"])
		}
		if out["reference_id"] == "" {
			t.Fatal("expected reference_id")
		}
	})
}

func TestMarketingContentHandler(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatal(err)
	}
	content := []byte("blog:\n  posts:\n    - slug: test-post\n      title: Test\n      description: Desc\n      published_at: \"2026-01-01\"\n      read_minutes: 5\n      category: Test\ncase_studies: {}\n")
	if err := os.WriteFile(filepath.Join(configDir, "marketing-content.yaml"), content, 0o644); err != nil {
		t.Fatal(err)
	}

	app := fiber.New()
	app.Get("/marketing-content", MarketingContentHandler(root))

	req := httptest.NewRequest(http.MethodGet, "/marketing-content", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var out map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	blog, ok := out["blog"].(map[string]interface{})
	if !ok {
		t.Fatal("expected blog object")
	}
	posts, ok := blog["posts"].([]interface{})
	if !ok || len(posts) != 1 {
		t.Fatalf("expected one post, got %v", blog["posts"])
	}
}
