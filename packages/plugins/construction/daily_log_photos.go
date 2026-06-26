package construction

import (
	"github.com/fieldforge/fieldforge/packages/core/response"
	"github.com/fieldforge/fieldforge/packages/core/storage"
	"time"

	"github.com/fieldforge/fieldforge/packages/core/tenant"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const dailyLogPhotosSQL = `
CREATE TABLE IF NOT EXISTS project_daily_log_photos (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL,
	daily_log_id UUID NOT NULL REFERENCES project_daily_logs(id) ON DELETE CASCADE,
	caption TEXT DEFAULT '',
	url TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_daily_log_photos_log ON project_daily_log_photos (tenant_id, daily_log_id);
ALTER TABLE project_daily_log_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_daily_log_photos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_daily_log_photos_tenant ON project_daily_log_photos;
CREATE POLICY project_daily_log_photos_tenant ON project_daily_log_photos
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`

const changeOrderWorkflowSQL = `
ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
`

type DailyLogPhoto struct {
	ID         string    `json:"id"`
	DailyLogID string    `json:"daily_log_id"`
	Caption    string    `json:"caption,omitempty"`
	URL        string    `json:"url"`
	CreatedAt  time.Time `json:"created_at"`
}

func (p *Plugin) listDailyLogPhotos(c *fiber.Ctx) error {
	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Params("id")
	logID := c.Params("logId")

	if err := p.assertDailyLogExists(c, tid, projectID, logID); err != nil {
		return err
	}

	rows, err := p.pool.Query(c.UserContext(), `
		SELECT id, daily_log_id, caption, url, created_at
		FROM project_daily_log_photos
		WHERE tenant_id = $1 AND daily_log_id = $2
		ORDER BY created_at
	`, tid, logID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load daily log photos")
	}
	defer rows.Close()

	list := []DailyLogPhoto{}
	for rows.Next() {
		var photo DailyLogPhoto
		if err := rows.Scan(&photo.ID, &photo.DailyLogID, &photo.Caption, &photo.URL, &photo.CreatedAt); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to load daily log photos")
		}
		list = append(list, photo)
	}
	return response.DataList(c, list)
}

func (p *Plugin) uploadDailyLogPhoto(c *fiber.Ctx) error {
	if p.storage == nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "file storage not configured")
	}

	tid, _ := tenant.ID(c.UserContext())
	projectID := c.Params("id")
	logID := c.Params("logId")

	data, err := storage.ReadFormFile(c, "photo", storage.MaxPhotoBytes)
	if err != nil {
		if code, msg, ok := storage.MapUploadError(err); ok {
			return fiber.NewError(code, msg)
		}
		return fiber.NewError(400, err.Error())
	}

	caption := c.FormValue("caption")

	if err := p.assertDailyLogExists(c, tid, projectID, logID); err != nil {
		return err
	}

	upload, err := p.storage.UploadPhoto(c.UserContext(), tid, "construction/daily-logs", logID, data)
	if err != nil {
		if code, msg, ok := storage.MapUploadError(err); ok {
			return fiber.NewError(code, msg)
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to upload photo")
	}

	id := uuid.New().String()
	var createdAt time.Time
	err = p.pool.QueryRow(c.UserContext(), `
		INSERT INTO project_daily_log_photos (id, tenant_id, daily_log_id, caption, url)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`, id, tid, logID, caption, upload.URL).Scan(&createdAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to save daily log photo")
	}

	return c.Status(201).JSON(DailyLogPhoto{
		ID: id, DailyLogID: logID, Caption: caption,
		URL: upload.URL, CreatedAt: createdAt,
	})
}

func (p *Plugin) assertDailyLogExists(c *fiber.Ctx, tid, projectID, logID string) error {
	var exists bool
	err := p.pool.QueryRow(c.UserContext(), `
		SELECT EXISTS(
			SELECT 1 FROM project_daily_logs
			WHERE id = $1 AND tenant_id = $2 AND project_id = $3
		)
	`, logID, tid, projectID).Scan(&exists)
	if err != nil || !exists {
		return fiber.NewError(404, "daily log not found")
	}
	return nil
}
