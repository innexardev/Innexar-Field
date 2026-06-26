package communications

import (
	"strings"
)

var defaultTestVariables = map[string]string{
	"customer_name":  "Jane Doe",
	"invoice_number": "INV-001",
}

// RenderTemplate replaces {{variable}} placeholders in subject and body.
func RenderTemplate(subject, bodyHTML string, vars map[string]string) (string, string) {
	merged := map[string]string{}
	for k, v := range defaultTestVariables {
		merged[k] = v
	}
	for k, v := range vars {
		merged[k] = v
	}
	return applyVariables(subject, merged), applyVariables(bodyHTML, merged)
}

func applyVariables(text string, vars map[string]string) string {
	out := text
	for key, value := range vars {
		out = strings.ReplaceAll(out, "{{"+key+"}}", value)
	}
	return out
}
