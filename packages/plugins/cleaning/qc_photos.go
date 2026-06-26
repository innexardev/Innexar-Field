package cleaning

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/storage"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const cleanQcPhotosSQL = `
CREATE TABLE IF NOT EXISTS clean_qc_photos (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	job_id UUID NOT NULL,
	kind TEXT NOT NULL DEFAULT 'after',
	caption TEXT DEFAULT '',
	url TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT clean_qc_photos_kind_check CHECK (kind IN ('before', 'after'))
);
CREATE INDEX IF NOT EXISTS idx_clean_qc_photos_job ON clean_qc_photos (tenant_id, job_id);
ALTER TABLE clean_qc_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean_qc_photos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clean_qc_photos_tenant ON clean_qc_photos;
CREATE POLICY clean_qc_photos_tenant ON clean_qc_photos
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

type QcPhoto struct {
	ID        string    `json:"id"`
	JobID     string    `json:"job_id"`
	Kind      string    `json:"kind"`
	Caption   string    `json:"caption,omitempty"`
	URL       string    `json:"url"`
	CreatedAt time.Time `json:"created_at"`
}

type QcReviewItem struct {
	ID         string `json:"id"`
	JobID      string `json:"job_id"`
	JobTitle   string `json:"job_title"`
	Phase      string `json:"phase"`
	Status     string `json:"status"`
	PhotoCount int    `json:"photo_count"`
	Score      *int   `json:"score,omitempty"`
}

func (p *Plugin) listJobPhotos(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	jobID := c.Params("id")

	if err := p.assertJobExists(c, tid, jobID); err != nil {
		return err
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, job_id, kind, caption, url, created_at
		FROM clean_qc_photos
		WHERE tenant_id = $1 AND job_id = $2
		ORDER BY created_at
	`, tid, jobID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load photos")
	}
	defer rows.Close()

	list := []QcPhoto{}
	for rows.Next() {
		var photo QcPhoto
		if err := rows.Scan(&photo.ID, &photo.JobID, &photo.Kind, &photo.Caption, &photo.URL, &photo.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load photos")
		}
		list = append(list, photo)
	}
	return response.DataList(c, list)
}

func (p *Plugin) uploadJobPhoto(c *fiber.Ctx) error {
	if p.storage == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "file storage not configured")
	}

	tid, _ := tenant.ID(c.UserContext())
	jobID := c.Params("id")

	data, err := storage.ReadFormFile(c, "photo", storage.MaxPhotoBytes)
	if err != nil {
		if code, msg, ok := storage.MapUploadError(err); ok {
			return fiber.NewError(code, msg)
		}
		return fiber.NewError(400, err.Error())
	}

	kind := c.FormValue("kind", "after")
	caption := c.FormValue("caption")
	if kind != "before" && kind != "after" {
		return fiber.NewError(400, "kind must be before or after")
	}

	if err := p.assertJobExists(c, tid, jobID); err != nil {
		return err
	}

	upload, err := p.storage.UploadPhoto(c.UserContext(), tid, "cleaning/qc", jobID, data)
	if err != nil {
		if code, msg, ok := storage.MapUploadError(err); ok {
			return fiber.NewError(code, msg)
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to upload photo")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		INSERT INTO clean_qc_photos (id, tenant_id, job_id, kind, caption, url)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`, id, tid, jobID, kind, caption, upload.URL).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save photo")
	}

	return c.Status(201).JSON(QcPhoto{
		ID: id, JobID: jobID, Kind: kind, Caption: caption,
		URL: upload.URL, CreatedAt: createdAt,
	})
}

func (p *Plugin) listQcReviews(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT j.id, j.title, COALESCE(cp.phase, 'final'), j.status,
			COALESCE(photo_counts.cnt, 0)
		FROM jobs j
		LEFT JOIN LATERAL (
			SELECT phase FROM clean_phases
			WHERE tenant_id = j.tenant_id AND job_id = j.id
			ORDER BY created_at DESC LIMIT 1
		) cp ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS cnt FROM clean_qc_photos
			WHERE tenant_id = j.tenant_id AND job_id = j.id
		) photo_counts ON true
		WHERE j.tenant_id = $1
		  AND j.status IN ('completed', 'in_progress', 'scheduled')
		ORDER BY j.scheduled_at DESC NULLS LAST
		LIMIT 25
	`, tid)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load qc queue")
	}
	defer rows.Close()

	list := []QcReviewItem{}
	for rows.Next() {
		var item QcReviewItem
		if err := rows.Scan(&item.JobID, &item.JobTitle, &item.Phase, &item.Status, &item.PhotoCount); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load qc queue")
		}
		item.ID = "qc-" + item.JobID
		if item.Status == "completed" && item.PhotoCount > 0 {
			score := 92
			item.Score = &score
			item.Status = "passed"
		} else if item.PhotoCount > 0 {
			item.Status = "pending"
		} else {
			item.Status = "awaiting_photos"
		}
		list = append(list, item)
	}
	if list == nil {
		list = []QcReviewItem{}
	}
	return response.DataListWith(c, list, fiber.Map{"status": "stub"})
}

func (p *Plugin) assertJobExists(c *fiber.Ctx, tid, jobID string) error {
	var exists bool
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT EXISTS(SELECT 1 FROM jobs WHERE id = $1 AND tenant_id = $2)
	`, jobID, tid).Scan(&exists)
	if err != nil || !exists {
		return fiber.NewError(404, "clean job not found")
	}
	return nil
}
