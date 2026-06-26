package documents

import (
	"fmt"
	"html"
	"strings"
)

// EstimateLine is a printable estimate line item.
type EstimateLine struct {
	Description string
	Quantity    float64
	UnitCents   int64
}

// EstimateData is the printable estimate payload.
type EstimateData struct {
	Title         string
	Status        string
	SubtotalCents int64
	TotalCents    int64
	CustomerName  string
	Lines         []EstimateLine
}

// RenderEstimateHTML returns a branded, print-ready HTML document.
func RenderEstimateHTML(brand Brand, est EstimateData) string {
	var metaRows strings.Builder
	if est.CustomerName != "" {
		metaRows.WriteString(metaBlock("Customer", html.EscapeString(est.CustomerName)))
	}

	var linesTable string
	if len(est.Lines) == 0 {
		linesTable = `<p class="muted">No line items.</p>`
	} else {
		var rows strings.Builder
		for _, line := range est.Lines {
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
</table>
<div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>%s</span></div>
  <div class="totals-row total"><span>Total</span><span>%s</span></div>
</div>`, rows.String(), FormatCents(est.SubtotalCents), FormatCents(est.TotalCents))
	}

	return documentShell(brand, documentShellInput{
		Title:       est.Title,
		Subtitle:    brand.Name,
		Status:      est.Status,
		MetaHTML:    metaRows.String(),
		BodyHTML:    linesTable,
		AmountLabel: "Total",
		AmountCents: est.TotalCents,
	})
}

type documentShellInput struct {
	Title       string
	Subtitle    string
	Status      string
	MetaHTML    string
	BodyHTML    string
	AmountLabel string
	AmountCents int64
}

func documentShell(brand Brand, in documentShellInput) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%s — %s</title>
  <style>
    :root {
      --primary: %s;
      --accent: %s;
      --bg: %s;
      --surface: %s;
      --border: %s;
      --text: %s;
      --text-secondary: %s;
      --text-muted: %s;
      --success: %s;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px;
      font-family: %s;
      color: var(--text);
      background: var(--bg);
      line-height: 1.5;
    }
    .doc { max-width: 800px; margin: 0 auto; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08); }
    .header { padding: 28px 32px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .eyebrow { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 8px; }
    h1 { margin: 0; font-size: 28px; color: var(--primary); }
    .status { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 6px 12px; border-radius: 999px; background: var(--surface); color: var(--text-secondary); }
    .status.paid, .status.accepted { color: var(--success); }
    .content { padding: 28px 32px 32px; }
    .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .meta-block { border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
    .meta-block .label { font-size: 12px; color: var(--text-muted); margin: 0 0 4px; }
    .meta-block .value { margin: 0; font-weight: 600; }
    table { width: 100%%; border-collapse: collapse; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 14px; }
    th { background: var(--surface); color: var(--text-muted); font-weight: 600; }
    tr:last-child td { border-bottom: 0; }
    td.num, th.num { text-align: right; }
    .totals { margin-top: 8px; padding: 16px; background: var(--surface); border-radius: 12px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
    .totals-row.total { margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--border); font-size: 18px; font-weight: 700; color: var(--text); }
    .amount-box { margin-top: 24px; padding: 20px; background: var(--surface); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; }
    .muted { color: var(--text-secondary); font-size: 14px; }
    .footer { margin-top: 24px; font-size: 12px; color: var(--text-muted); text-align: center; }
    @media print {
      body { padding: 0; }
      .doc { border: 0; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <p class="eyebrow">%s</p>
        <h1>%s</h1>
      </div>
      <span class="status %s">%s</span>
    </div>
    <div class="content">
      <div class="meta">%s</div>
      %s
      <div class="amount-box">
        <span>%s</span>
        <span>%s</span>
      </div>
      <p class="footer">Generated by %s</p>
    </div>
  </div>
</body>
</html>`,
		html.EscapeString(in.Title),
		html.EscapeString(brand.Name),
		brand.color("primary", "#0F172A"),
		brand.color("accent", "#2563EB"),
		brand.color("background", "#FFFFFF"),
		brand.color("surface_elevated", "#F1F5F9"),
		brand.color("border", "#E2E8F0"),
		brand.color("text_primary", "#0F172A"),
		brand.color("text_secondary", "#475569"),
		brand.color("text_muted", "#94A3B8"),
		brand.color("success", "#059669"),
		html.EscapeString(brand.FontSans),
		html.EscapeString(in.Subtitle),
		html.EscapeString(in.Title),
		html.EscapeString(in.Status),
		html.EscapeString(in.Status),
		in.MetaHTML,
		in.BodyHTML,
		html.EscapeString(in.AmountLabel),
		FormatCents(in.AmountCents),
		html.EscapeString(brand.Name),
	)
}

func metaBlock(label, value string) string {
	return fmt.Sprintf(`<div class="meta-block"><p class="label">%s</p><p class="value">%s</p></div>`, html.EscapeString(label), value)
}
