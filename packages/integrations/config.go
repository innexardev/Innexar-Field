package integrations

import (
	"github.com/fieldforge/fieldforge/packages/core/config"
)

const (
	IDQuickBooks    = config.IntegrationQuickBooks
	IDAvalara       = config.IntegrationAvalara
	IDStripeConnect = config.IntegrationStripeConnect
	IDTwilio         = config.IntegrationTwilio
	IDGoogleCalendar = config.IntegrationGoogleCalendar
)

type IntegrationDef = config.IntegrationConfig

func Catalog(cfg *config.AppConfig) []IntegrationDef {
	return cfg.IntegrationCatalog()
}

func Get(cfg *config.AppConfig, id string) (IntegrationDef, bool) {
	return cfg.IntegrationByID(id)
}

func MockAvalara(cfg *config.AppConfig) bool {
	return cfg.MockAvalara()
}

func MockQuickBooks(cfg *config.AppConfig) bool {
	return cfg.MockQuickBooks()
}

func MockRate(cfg *config.AppConfig) float64 {
	return cfg.AvalaraMockRate()
}
