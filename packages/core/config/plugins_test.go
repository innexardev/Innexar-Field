package config

import "testing"

func TestPluginsForSignup_FieldServicesStarterIncludesDispatch(t *testing.T) {
	cfg := &AppConfig{
		IndustryPacks: map[string]IndustryPackConfig{
			"field-services": {
				CoreModules: []string{"crm", "estimating", "scheduling", "invoicing"},
				Plugins:     []string{"dispatch", "accounting"},
			},
		},
	}

	plugins := cfg.PluginsForSignup("field-services", "starter")
	want := []string{"crm", "estimating", "scheduling", "invoicing", "dispatch", "accounting"}
	if len(plugins) != len(want) {
		t.Fatalf("got %v, want %v", plugins, want)
	}
	for i, id := range want {
		if plugins[i] != id {
			t.Fatalf("got %v, want %v", plugins, want)
		}
	}
}

func TestPluginsForSignup_ConstructionBusinessAddsOptional(t *testing.T) {
	cfg := &AppConfig{
		IndustryPacks: map[string]IndustryPackConfig{
			"construction": {
				CoreModules: []string{"crm", "estimating", "scheduling", "invoicing"},
				Plugins:     []string{"construction", "job-costing"},
				Optional:    []string{"dispatch", "expenses"},
			},
		},
	}

	starter := cfg.PluginsForSignup("construction", "starter")
	if contains(starter, "dispatch") {
		t.Fatal("starter should not include optional dispatch")
	}

	business := cfg.PluginsForSignup("construction", "business")
	for _, id := range []string{"construction", "job-costing", "dispatch", "expenses"} {
		if !contains(business, id) {
			t.Fatalf("business missing %s in %v", id, business)
		}
	}
}

func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}
