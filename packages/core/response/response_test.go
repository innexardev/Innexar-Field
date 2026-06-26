package response

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestDataList_nilSliceEncodesEmptyArray(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		var list []string
		return DataList(c, list)
	})

	req := httptest.NewRequest("GET", "/", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	var parsed struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatal(err)
	}
	if string(parsed.Data) != "[]" {
		t.Fatalf("expected [], got %s", parsed.Data)
	}
}
