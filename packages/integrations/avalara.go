package integrations

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/config"
)

// AvalaraCalculateRequest is the tax calculation input.
type AvalaraCalculateRequest struct {
	AmountCents int64  `json:"amount_cents"`
	ShipToState string `json:"ship_to_state"`
	ShipToZip   string `json:"ship_to_zip,omitempty"`
	LineCount   int    `json:"line_count,omitempty"`
}

// AvalaraCalculateResult is the tax calculation output.
type AvalaraCalculateResult struct {
	AmountCents   int64   `json:"amount_cents"`
	TaxCents      int64   `json:"tax_cents"`
	TotalCents    int64   `json:"total_cents"`
	RatePercent   float64 `json:"rate_percent"`
	Jurisdiction  string  `json:"jurisdiction"`
	Mock          bool    `json:"mock,omitempty"`
	TaxPending    bool    `json:"tax_pending,omitempty"`
	Provider      string  `json:"provider"`
	IntegrationID string  `json:"integration_id"`
}

type avalaraService struct {
	cfg *config.AppConfig
}

func newAvalara(cfg *config.AppConfig) *avalaraService {
	return &avalaraService{cfg: cfg}
}

func (s *avalaraService) Calculate(_ context.Context, req AvalaraCalculateRequest) (*AvalaraCalculateResult, error) {
	def, ok := s.cfg.IntegrationByID(IDAvalara)
	if !ok || !def.Enabled {
		return nil, fmt.Errorf("avalara integration is disabled")
	}
	if req.AmountCents < 0 {
		return nil, fmt.Errorf("amount_cents must be non-negative")
	}

	jurisdiction := avalaraJurisdiction(req.ShipToState, req.ShipToZip)
	rate := s.cfg.AvalaraMockRate()
	mock := s.cfg.MockAvalara()

	if !mock {
		return &AvalaraCalculateResult{
			AmountCents:   req.AmountCents,
			TaxCents:      0,
			TotalCents:    req.AmountCents,
			RatePercent:   0,
			Jurisdiction:  jurisdiction,
			TaxPending:    true,
			Provider:      def.Name,
			IntegrationID: def.ID,
		}, nil
	}

	taxCents := int64(math.Round(float64(req.AmountCents) * rate / 100))
	return &AvalaraCalculateResult{
		AmountCents:   req.AmountCents,
		TaxCents:      taxCents,
		TotalCents:    req.AmountCents + taxCents,
		RatePercent:   rate,
		Jurisdiction:  jurisdiction,
		Mock:          true,
		Provider:      def.Name,
		IntegrationID: def.ID,
	}, nil
}

func avalaraJurisdiction(state, zip string) string {
	state = strings.ToUpper(strings.TrimSpace(state))
	if state == "" {
		state = "US"
	}
	if zip != "" {
		return state + " " + strings.TrimSpace(zip)
	}
	return state
}
