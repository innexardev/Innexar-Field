package plugin

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubPlugin struct{ id string }

func (s stubPlugin) Manifest() Manifest {
	return Manifest{ID: s.id, Name: s.id}
}
func (s stubPlugin) RegisterRoutes(fiber.Router, Deps) {}
func (s stubPlugin) Migrations() []Migration           { return nil }

func TestRegistryRegisterAndSort(t *testing.T) {
	r := NewRegistry()
	require.NoError(t, r.Register(stubPlugin{id: "crm"}))
	require.NoError(t, r.Register(stubPlugin{id: "billing"}))
	require.Error(t, r.Register(stubPlugin{id: "crm"}))

	all := r.All()
	assert.Len(t, all, 2)
	assert.Equal(t, "billing", all[0].Manifest().ID)
}
