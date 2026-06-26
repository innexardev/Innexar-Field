package documents

import (
	"fmt"
	"html"
	"strings"
	"time"
)

// InvoiceLine is a printable invoice line item.
type InvoiceLine struct {
	Description string
	Quantity    float64
	UnitCents   int64
}

// InvoiceData is the printable invoice payload.
type InvoiceData struct {
	InvoiceNumber string
	Status        string
	TotalCents    int64
	DueAt         *time.Time
	PaidAt        *time.Time
	CustomerName  string
	Lines         []InvoiceLine
}

// RenderInvoiceHTML returns a branded, print-ready HTML document.
func RenderInvoiceHTML(brand Brand, inv InvoiceData) string {
	amountLabel := "Amount due"
	if inv.Status == "paid" {
		amountLabel = "Amount paid"
	}

	var metaRows strings.Builder
	if inv.DueAt != nil {
		metaRows.WriteString(metaBlock("Due date", inv.DueAt.Format("Jan 2, 2006")))
	}
	if inv.PaidAt != nil {
		metaRows.WriteString(metaBlock("Paid on", inv.PaidAt.Format("Jan 2, 2006")))
	}
	if inv.CustomerName != "" {
		metaRows.WriteString(metaBlock("Customer", html.EscapeString(inv.CustomerName)))
	}

	var linesTable string
	if len(inv.Lines) > 0 {
		var rows strings.Builder
		for _, line := range inv.Lines {
			lineTotal := int64(line.Quantity * float64(line.UnitCents))
			rows.WriteString(fmt.Sprintf(
				`<tr><td>%s</td><td>%s</td><td>%s</td><td class="num">%s</td></tr>`,
				html.EscapeString(line.Description),
				formatQuantity(line.Quantity),
				FormatCents(line.UnitCents),
				FormatCents(lineTotal),
			))
		}
		linesTable = fmt.Sprintf(`
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit</th>
      <th class="num">Total</th>
    </tr>
  </thead>
  <tbody>%s</tbody>
</table>`, rows.String())
	}

	return documentShell(brand, documentShellInput{
		Title:       inv.InvoiceNumber,
		Subtitle:    brand.LegalName,
		Status:      inv.Status,
		MetaHTML:    metaRows.String(),
		BodyHTML:    linesTable,
		AmountLabel: amountLabel,
		AmountCents: inv.TotalCents,
	})
}

func formatQuantity(q float64) string {
	if q == float64(int64(q)) {
		return fmt.Sprintf("%d", int64(q))
	}
	return fmt.Sprintf("%.2f", q)
}
