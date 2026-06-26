package crm

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefaultContractTemplates(t *testing.T) {
	templates := DefaultContractTemplates()
	require.Len(t, templates, 3)

	slugs := make([]string, len(templates))
	for i, tmpl := range templates {
		assert.NotEmpty(t, tmpl.Slug)
		assert.NotEmpty(t, tmpl.NameKey)
		assert.NotEmpty(t, tmpl.Category)
		assert.Contains(t, tmpl.Body, "GOVERNING LAW")
		assert.Contains(t, tmpl.Body, "Signature:")
		slugs[i] = tmpl.Slug
	}

	assert.ElementsMatch(t, []string{
		"residential-cleaning",
		"commercial-cleaning",
		"field-service-maintenance",
	}, slugs)
}

func TestDefaultContractTemplates_RequiredSections(t *testing.T) {
	requiredPhrases := []string{
		"Parties",
		"PAYMENT",
		"CANCELLATION",
		"LIMITATION OF LIABILITY",
		"State of [STATE]",
	}

	for _, tmpl := range DefaultContractTemplates() {
		body := tmpl.Body
		for _, phrase := range requiredPhrases {
			assert.Contains(t, body, phrase, "template %s missing %q", tmpl.Slug, phrase)
		}
	}
}
