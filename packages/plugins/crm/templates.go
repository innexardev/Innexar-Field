package crm

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ContractTemplate is a tenant-scoped reusable agreement boilerplate.
type ContractTemplate struct {
	ID       string `json:"id"`
	Slug     string `json:"slug"`
	NameKey  string `json:"name_key"`
	Category string `json:"category"`
	Body     string `json:"body"`
}

type defaultTemplate struct {
	Slug     string
	NameKey  string
	Category string
	Body     string
}

// DefaultContractTemplates returns standard US service agreement boilerplate.
// Not legal advice — tenants should review with counsel before use.
func DefaultContractTemplates() []defaultTemplate {
	return []defaultTemplate{
		{
			Slug:     "residential-cleaning",
			NameKey:  "residentialCleaning",
			Category: "cleaning",
			Body: residentialCleaningBody,
		},
		{
			Slug:     "commercial-cleaning",
			NameKey:  "commercialCleaning",
			Category: "cleaning",
			Body: commercialCleaningBody,
		},
		{
			Slug:     "field-service-maintenance",
			NameKey:  "fieldServiceMaintenance",
			Category: "field-services",
			Body: fieldServiceMaintenanceBody,
		},
	}
}

// EnsureContractTemplates inserts default templates for a tenant when none exist.
func EnsureContractTemplates(ctx context.Context, pool *pgxpool.Pool, tenantID string) error {
	var count int
	err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM contract_templates WHERE tenant_id = $1
	`, tenantID).Scan(&count)
	if err != nil {
		return fmt.Errorf("count contract templates: %w", err)
	}
	if count > 0 {
		return nil
	}

	for _, tmpl := range DefaultContractTemplates() {
		_, err := pool.Exec(ctx, `
			INSERT INTO contract_templates (id, tenant_id, slug, name_key, category, body)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, uuid.New().String(), tenantID, tmpl.Slug, tmpl.NameKey, tmpl.Category, tmpl.Body)
		if err != nil {
			return fmt.Errorf("seed template %s: %w", tmpl.Slug, err)
		}
	}
	return nil
}

const residentialCleaningBody = `RESIDENTIAL CLEANING SERVICE AGREEMENT

This Residential Cleaning Service Agreement ("Agreement") is entered into as of __________ ("Effective Date") by and between:

SERVICE PROVIDER ("Provider"):
[Company Legal Name]
[Street Address]
[City, State ZIP]
Phone: [Phone] | Email: [Email]

CUSTOMER ("Customer"):
[Customer Name]
[Service Address]
[City, State ZIP]
Phone: [Phone] | Email: [Email]

Provider and Customer are each a "Party" and collectively the "Parties."

1. SERVICES AND SCOPE
Provider agrees to perform residential cleaning services at the Service Address according to the schedule and specifications agreed in writing (the "Services"). Standard Services may include dusting, vacuuming, mopping, kitchen and bathroom cleaning, trash removal, and surface sanitization unless otherwise specified. Provider will furnish labor, equipment, and cleaning supplies unless Customer requests specific products.

2. TERM
This Agreement begins on the Effective Date and continues on a [weekly / bi-weekly / monthly] basis until terminated under Section 6. Either Party may propose changes to frequency or scope in writing.

3. PAYMENT TERMS
Customer agrees to pay Provider [amount] per service visit, or [amount] per month for recurring service, plus applicable sales tax. Invoices are due within fifteen (15) days of the invoice date. Late payments may accrue interest at the lesser of 1.5% per month or the maximum rate permitted by law. Provider may suspend Services for accounts more than thirty (30) days past due.

4. ACCESS AND CUSTOMER RESPONSIBILITIES
Customer will provide safe access to the premises at scheduled times, secure pets, and disclose fragile items, alarms, or hazards. Customer is responsible for theft or damage to valuables not secured. Provider is not responsible for normal wear, pre-existing conditions, or damage caused by defective surfaces or fixtures.

5. INSURANCE
Provider represents that it maintains general liability insurance customary for residential cleaning operations. Certificates of insurance are available upon request.

6. CANCELLATION
Either Party may cancel this Agreement with at least forty-eight (48) hours' written notice before the next scheduled service. Customer remains responsible for Services already performed and any minimum fees stated on the invoice.

7. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVIDER'S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE AMOUNTS PAID BY CUSTOMER TO PROVIDER IN THE THREE (3) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

8. INDEPENDENT CONTRACTOR
Provider performs Services as an independent contractor. Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship.

9. GOVERNING LAW
This Agreement is governed by the laws of the State of [STATE], without regard to conflict-of-law principles. Exclusive venue for disputes shall lie in the state or federal courts located in [COUNTY], [STATE].

10. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the Parties and supersedes prior discussions. Amendments must be in writing and signed by both Parties.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

SERVICE PROVIDER:

Signature: _____________________________  Date: _______________
Printed Name: _________________________
Title: ________________________________

CUSTOMER:

Signature: _____________________________  Date: _______________
Printed Name: _________________________`

const commercialCleaningBody = `COMMERCIAL CLEANING CONTRACT

This Commercial Cleaning Contract ("Contract") is made effective as of __________ ("Effective Date") by and between:

CONTRACTOR ("Contractor"):
[Company Legal Name]
[Street Address]
[City, State ZIP]
Phone: [Phone] | Email: [Email]

CLIENT ("Client"):
[Client Legal Name]
[Premises Address]
[City, State ZIP]
Phone: [Phone] | Email: [Email]

Contractor and Client are each a "Party" and collectively the "Parties."

1. SCOPE OF WORK
Contractor shall provide commercial janitorial and cleaning services at the Premises (the "Services") according to the attached scope of work, frequency schedule, and quality standards. Services typically include routine cleaning of offices, common areas, restrooms, break rooms, trash removal, floor care, and consumables restocking as specified. Additional services require a written change order.

2. TERM
The initial term is twelve (12) months from the Effective Date and renews automatically for successive one (1) month periods unless either Party gives thirty (30) days' written notice of non-renewal before the end of the then-current term.

3. COMPENSATION AND PAYMENT
Client shall pay Contractor [monthly / per-visit amount] plus applicable taxes, invoiced [monthly / bi-weekly]. Payment is due net thirty (30) days from invoice date. Contractor may charge a reasonable fee for returned payments and may suspend Services for undisputed balances overdue by more than forty-five (45) days.

4. PERFORMANCE STANDARDS
Contractor will perform Services in a professional manner consistent with industry standards. Client will provide after-hours access codes, keys, or escorts as needed. Client shall maintain a safe work environment and notify Contractor of hazardous materials or special handling requirements.

5. INSURANCE AND INDEMNITY
Contractor shall maintain commercial general liability and workers' compensation insurance as required by law. Each Party shall indemnify the other for losses arising from its own negligence or willful misconduct, subject to applicable insurance and limitation provisions.

6. CONFIDENTIALITY
Contractor personnel may have access to confidential areas. Contractor agrees to use reasonable measures to protect Client property and confidential information encountered during performance of the Services.

7. CANCELLATION
Either Party may terminate for material breach if the breaching Party fails to cure within fifteen (15) days of written notice. Either Party may terminate without cause upon sixty (60) days' written notice. Client shall pay for Services performed through the termination date and any non-cancellable supply commitments.

8. LIMITATION OF LIABILITY
EXCEPT FOR INDEMNIFICATION OBLIGATIONS OR BREACH OF CONFIDENTIALITY, NEITHER PARTY'S AGGREGATE LIABILITY UNDER THIS CONTRACT SHALL EXCEED THE FEES PAID OR PAYABLE BY CLIENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

9. GOVERNING LAW
This Contract is governed by the laws of the State of [STATE]. The Parties consent to exclusive jurisdiction in [COUNTY], [STATE].

10. ENTIRE AGREEMENT
This Contract, including any exhibits, is the entire agreement between the Parties. Modifications must be in writing and signed by authorized representatives.

AUTHORIZED SIGNATURES

CONTRACTOR:

Signature: _____________________________  Date: _______________
Printed Name: _________________________
Title: ________________________________

CLIENT:

Signature: _____________________________  Date: _______________
Printed Name: _________________________
Title: ________________________________`

const fieldServiceMaintenanceBody = `FIELD SERVICE AND MAINTENANCE AGREEMENT

This Field Service and Maintenance Agreement ("Agreement") is entered into as of __________ ("Effective Date") by and between:

SERVICE PROVIDER ("Provider"):
[Company Legal Name]
[Street Address]
[City, State ZIP]
Phone: [Phone] | Email: [Email]

CUSTOMER ("Customer"):
[Customer Name]
[Service Location(s)]
[City, State ZIP]
Phone: [Phone] | Email: [Email]

Provider and Customer are each a "Party" and collectively the "Parties."

1. SERVICES
Provider agrees to perform field service, repair, and/or preventive maintenance work ("Services") for equipment, systems, or facilities at the Service Location(s) as described in work orders, service schedules, or attached exhibits. Services may include diagnostics, labor, standard parts, testing, and documentation unless otherwise specified.

2. TERM AND SCHEDULING
This Agreement begins on the Effective Date and continues until terminated under Section 7. Emergency and scheduled visits will be performed during Provider's normal business hours unless premium after-hours rates are agreed in writing. Customer will provide safe access and necessary utilities.

3. FEES AND PAYMENT
Customer will pay (a) a recurring maintenance fee of [amount] per [month / quarter], and/or (b) time-and-materials rates of [hourly rate] per hour plus parts at cost plus [markup]%, and trip charges as stated on the invoice. Invoices are due net thirty (30) days. Undisputed past-due amounts may incur finance charges and collection costs permitted by law.

4. PARTS AND WARRANTIES
Provider warrants that Services will be performed in a workmanlike manner. Manufacturer warranties apply to parts supplied. Provider's service warranty is limited to re-performance of defective labor for thirty (30) days from completion unless otherwise stated on the work order.

5. CUSTOMER OBLIGATIONS
Customer will maintain accurate asset records, disclose known hazards, and comply with site safety rules. Customer is responsible for permits or code compliance unless expressly included in a written scope.

6. LIMITATION OF LIABILITY
PROVIDER'S TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THIS AGREEMENT SHALL NOT EXCEED THE GREATER OF (A) FEES PAID BY CUSTOMER IN THE SIX (6) MONTHS BEFORE THE CLAIM OR (B) [AMOUNT]. PROVIDER IS NOT LIABLE FOR LOSS OF USE, LOST PROFITS, OR INDIRECT OR CONSEQUENTIAL DAMAGES. THESE LIMITATIONS APPLY TO THE FULLEST EXTENT PERMITTED BY LAW.

7. CANCELLATION
Either Party may terminate upon thirty (30) days' written notice. Either Party may terminate immediately for material breach not cured within fifteen (15) days of notice. Customer remains responsible for completed work, ordered parts, and minimum contract fees through the termination date.

8. INDEPENDENT CONTRACTOR
Provider is an independent contractor. Provider is solely responsible for taxes, insurance, and employment obligations for its personnel.

9. GOVERNING LAW
This Agreement is governed by the laws of the State of [STATE], without regard to conflicts principles. Disputes shall be resolved in the state or federal courts of [COUNTY], [STATE].

10. ENTIRE AGREEMENT
This Agreement supersedes prior proposals and may be amended only in a written instrument signed by both Parties.

SIGNATURES

SERVICE PROVIDER:

Signature: _____________________________  Date: _______________
Printed Name: _________________________
Title: ________________________________

CUSTOMER:

Signature: _____________________________  Date: _______________
Printed Name: _________________________
Title: ________________________________`
