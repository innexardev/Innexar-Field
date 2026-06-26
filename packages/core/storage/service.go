package storage

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// LogoUploadResult is returned after a successful logo upload.
type LogoUploadResult struct {
	LogoURL string `json:"logo_url"`
}

// Service stores tenant logos in R2, local disk, or mock data URLs.
type Service struct {
	cfg Config
}

func NewService(cfg Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) UploadLogo(_ context.Context, tenantID string, data []byte) (*LogoUploadResult, error) {
	if tenantID == "" {
		return nil, ErrLogoTenantMissing
	}

	contentType, ext, err := ValidateLogo(data)
	if err != nil {
		return nil, err
	}

	objectID := uuid.New().String()
	key := LogoObjectKey(tenantID, objectID, ext)

	switch {
	case s.cfg.Mock:
		encoded := base64.StdEncoding.EncodeToString(data)
		return &LogoUploadResult{
			LogoURL: fmt.Sprintf("data:%s;base64,%s", contentType, encoded),
		}, nil
	case s.cfg.R2Configured():
		url, err := s.uploadR2(key, data, contentType)
		if err != nil {
			return nil, fmt.Errorf("upload logo to R2: %w", err)
		}
		return &LogoUploadResult{LogoURL: url}, nil
	case s.cfg.UseLocal():
		url, err := s.uploadLocal(key, data)
		if err != nil {
			return nil, fmt.Errorf("upload logo locally: %w", err)
		}
		return &LogoUploadResult{LogoURL: url}, nil
	default:
		return nil, fmt.Errorf("file storage not configured: set R2_* env vars, R2_MOCK=1, or use local uploads/ fallback")
	}
}

func (s *Service) uploadR2(key string, data []byte, contentType string) (string, error) {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", s.cfg.AccountID)
	client := s3.New(s3.Options{
		Region: "auto",
		Credentials: credentials.NewStaticCredentialsProvider(
			s.cfg.AccessKeyID,
			s.cfg.SecretAccessKey,
			"",
		),
		BaseEndpoint: aws.String(endpoint),
	})

	_, err := client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(s.cfg.Bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", err
	}
	return s.cfg.PublicURL + "/" + key, nil
}

func (s *Service) uploadLocal(key string, data []byte) (string, error) {
	path := filepath.Join(s.cfg.LocalDir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	return s.cfg.LocalPublicURL + "/" + key, nil
}

// LocalDir returns the directory used for local uploads (for static file serving).
func (s *Service) LocalDir() string {
	return s.cfg.LocalDir
}

// UseLocal reports whether uploads are stored on local disk.
func (s *Service) UseLocal() bool {
	return s.cfg.UseLocal()
}
