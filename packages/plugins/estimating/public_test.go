package estimating

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestNewPublicToken(t *testing.T) {
	a := newPublicToken()
	b := newPublicToken()
	assert.Len(t, a, 32)
	assert.NotEqual(t, a, b)
	assert.NotContains(t, a, "-")
}

func TestPlugin_PublicRoutesRegistered(t *testing.T) {
	p := New(nil, nil)
	app := fiber.New()
	group := app.Group("/public")
	p.RegisterPublicRoutes(group, func(c *fiber.Ctx) error { return c.Next() })

	paths := make(map[string]bool)
	for _, r := range app.GetRoutes() {
		paths[r.Method+" "+r.Path] = true
	}

	assert.True(t, paths["GET /public/quotes/:token"])
	assert.True(t, paths["POST /public/quotes/:token/accept"])
}
