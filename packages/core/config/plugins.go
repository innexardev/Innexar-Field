package config

// PluginsForSignup returns plugin IDs provisioned for a new tenant.
func (c *AppConfig) PluginsForSignup(pack, plan string) []string {
	if pack == "" {
		pack = "field-services"
	}
	pcfg, ok := c.IndustryPacks[pack]
	if !ok {
		return fallbackPluginsForPack(pack, plan)
	}

	seen := make(map[string]bool)
	var plugins []string
	add := func(ids ...string) {
		for _, id := range ids {
			if id == "" || seen[id] {
				continue
			}
			seen[id] = true
			plugins = append(plugins, id)
		}
	}

	add(pcfg.CoreModules...)
	add(pcfg.Plugins...)

	if plan == "business" || plan == "pro" || plan == "enterprise" {
		add(pcfg.Optional...)
	}

	return plugins
}

func fallbackPluginsForPack(pack, plan string) []string {
	base := []string{"crm", "estimating", "scheduling", "invoicing"}
	switch pack {
	case "cleaning":
		base = append(base, "cleaning")
	case "construction":
		base = append(base, "construction", "job-costing")
	case "field-services":
		base = append(base, "dispatch")
	}
	if plan == "business" || plan == "pro" || plan == "enterprise" {
		base = append(base, "dispatch", "expenses", "job-costing")
	}
	return dedupeStrings(base)
}

func dedupeStrings(in []string) []string {
	seen := make(map[string]bool, len(in))
	var out []string
	for _, s := range in {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}
