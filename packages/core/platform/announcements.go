package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// PlatformAnnouncement is a tenant-facing banner managed by platform operators.
type PlatformAnnouncement struct {
	ID        string     `json:"id"`
	Message   string     `json:"message"`
	Severity  string     `json:"severity"`
	Active    bool       `json:"active"`
	StartsAt  *time.Time `json:"starts_at,omitempty"`
	EndsAt    *time.Time `json:"ends_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// AnnouncementInput is the POST/PATCH body for announcements.
type AnnouncementInput struct {
	Message  string     `json:"message"`
	Severity string     `json:"severity"`
	Active   *bool      `json:"active"`
	StartsAt *time.Time `json:"starts_at"`
	EndsAt   *time.Time `json:"ends_at"`
}

func (s *Service) ListAnnouncements(ctx context.Context) ([]PlatformAnnouncement, error) {
	raw, err := s.loadAnnouncementsRaw(ctx)
	if err != nil {
		return nil, err
	}
	return parseAnnouncements(raw), nil
}

func (s *Service) CreateAnnouncement(ctx context.Context, adminID string, in AnnouncementInput) (*PlatformAnnouncement, error) {
	msg := strings.TrimSpace(in.Message)
	if msg == "" {
		return nil, fmt.Errorf("message is required")
	}
	severity := strings.TrimSpace(in.Severity)
	if severity == "" {
		severity = "info"
	}
	if err := validateAnnouncementSeverity(severity); err != nil {
		return nil, err
	}

	active := true
	if in.Active != nil {
		active = *in.Active
	}

	announcement := PlatformAnnouncement{
		ID:        uuid.New().String(),
		Message:   msg,
		Severity:  severity,
		Active:    active,
		StartsAt:  in.StartsAt,
		EndsAt:    in.EndsAt,
		CreatedAt: time.Now().UTC(),
	}

	list, err := s.ListAnnouncements(ctx)
	if err != nil {
		return nil, err
	}
	list = append(list, announcement)
	if err := s.saveAnnouncements(ctx, list); err != nil {
		return nil, err
	}
	_ = s.audit(ctx, adminID, "create", "announcement", announcement.ID, nil)
	return &announcement, nil
}

func (s *Service) UpdateAnnouncement(ctx context.Context, adminID, id string, in AnnouncementInput) (*PlatformAnnouncement, error) {
	list, err := s.ListAnnouncements(ctx)
	if err != nil {
		return nil, err
	}
	var updated *PlatformAnnouncement
	for i := range list {
		if list[i].ID != id {
			continue
		}
		if in.Message != "" {
			list[i].Message = strings.TrimSpace(in.Message)
		}
		if in.Severity != "" {
			if err := validateAnnouncementSeverity(in.Severity); err != nil {
				return nil, err
			}
			list[i].Severity = in.Severity
		}
		if in.Active != nil {
			list[i].Active = *in.Active
		}
		if in.StartsAt != nil {
			list[i].StartsAt = in.StartsAt
		}
		if in.EndsAt != nil {
			list[i].EndsAt = in.EndsAt
		}
		updated = &list[i]
		break
	}
	if updated == nil {
		return nil, nil
	}
	if err := s.saveAnnouncements(ctx, list); err != nil {
		return nil, err
	}
	_ = s.audit(ctx, adminID, "update", "announcement", id, nil)
	return updated, nil
}

func (s *Service) DeleteAnnouncement(ctx context.Context, adminID, id string) (bool, error) {
	list, err := s.ListAnnouncements(ctx)
	if err != nil {
		return false, err
	}
	next := make([]PlatformAnnouncement, 0, len(list))
	found := false
	for _, a := range list {
		if a.ID == id {
			found = true
			continue
		}
		next = append(next, a)
	}
	if !found {
		return false, nil
	}
	if err := s.saveAnnouncements(ctx, next); err != nil {
		return false, err
	}
	_ = s.audit(ctx, adminID, "delete", "announcement", id, nil)
	return true, nil
}

func validateAnnouncementSeverity(severity string) error {
	switch severity {
	case "info", "warning", "critical":
		return nil
	default:
		return fmt.Errorf("severity must be info, warning, or critical")
	}
}

func (s *Service) loadAnnouncementsRaw(ctx context.Context) ([]byte, error) {
	var raw []byte
	err := s.pool.QueryRow(ctx, `
		SELECT announcements FROM platform_config WHERE id = 1
	`).Scan(&raw)
	if err == pgx.ErrNoRows {
		return []byte("[]"), nil
	}
	if err != nil {
		return nil, fmt.Errorf("load announcements: %w", err)
	}
	return raw, nil
}

func parseAnnouncements(raw []byte) []PlatformAnnouncement {
	if len(raw) == 0 {
		return []PlatformAnnouncement{}
	}
	var list []PlatformAnnouncement
	if err := json.Unmarshal(raw, &list); err != nil {
		return []PlatformAnnouncement{}
	}
	if list == nil {
		return []PlatformAnnouncement{}
	}
	return list
}

func (s *Service) saveAnnouncements(ctx context.Context, list []PlatformAnnouncement) error {
	raw, err := json.Marshal(list)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE platform_config SET announcements = $1, updated_at = NOW() WHERE id = 1
	`, raw)
	if err != nil {
		return fmt.Errorf("save announcements: %w", err)
	}
	return nil
}
