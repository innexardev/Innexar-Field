package portal

import (
	"time"

	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
)

type PortalDocument struct {
	ID          string    `json:"id"`
	Kind        string    `json:"kind"`
	Title       string    `json:"title"`
	Status      string    `json:"status"`
	AmountCents int64     `json:"amount_cents"`
	ViewURL     string    `json:"view_url"`
	PDFURL      string    `json:"pdf_url,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (p *Plugin) listDocuments(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	cid, _ := tenant.CustomerID(c.UserContext())

	list := make([]PortalDocument, 0)

	estRows, err := p.pool.Query(c.UserContext(), `
		SELECT id, title, status, total_cents, COALESCE(public_token, ''), created_at
		FROM estimates
		WHERE tenant_id = $1 AND customer_id = $2::uuid
			AND status IN ('sent', 'accepted')
			AND public_token IS NOT NULL AND public_token <> ''
		ORDER BY created_at DESC
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list documents")
	}
	defer estRows.Close()

	for estRows.Next() {
		var doc PortalDocument
		var token string
		if err := estRows.Scan(&doc.ID, &doc.Title, &doc.Status, &doc.AmountCents, &token, &doc.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list documents")
		}
		doc.Kind = "estimate"
		doc.ViewURL = "/p/" + token
		doc.PDFURL = "/p/" + token
		list = append(list, doc)
	}

	ctrRows, err := p.pool.Query(c.UserContext(), `
		SELECT id, title, status, amount_cents, created_at
		FROM contracts
		WHERE tenant_id = $1 AND customer_id = $2::uuid
			AND status IN ('active', 'sent', 'signed')
		ORDER BY created_at DESC
	`, tid, cid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to list documents")
	}
	defer ctrRows.Close()

	for ctrRows.Next() {
		var doc PortalDocument
		if err := ctrRows.Scan(&doc.ID, &doc.Title, &doc.Status, &doc.AmountCents, &doc.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to list documents")
		}
		doc.Kind = "contract"
		doc.ViewURL = "/portal/documents?contract=" + doc.ID
		list = append(list, doc)
	}

	return response.DataList(c, list)
}
