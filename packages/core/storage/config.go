package storage

import (
	"os"
	"strings"
)

// Config holds Cloudflare R2 and local dev upload settings.
type Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	PublicURL       string
	Mock            bool
	LocalDir        string
	LocalPublicURL  string
}

// LoadConfigFromEnv reads upload storage settings from the environment.
func LoadConfigFromEnv() Config {
	localPublic := strings.TrimRight(os.Getenv("UPLOAD_LOCAL_PUBLIC_URL"), "/")
	if localPublic == "" {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8081"
		}
		localPublic = "http://localhost:" + port + "/uploads"
	}
	localDir := os.Getenv("UPLOAD_LOCAL_DIR")
	if localDir == "" {
		localDir = "uploads"
	}
	return Config{
		AccountID:       os.Getenv("R2_ACCOUNT_ID"),
		AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
		SecretAccessKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		Bucket:          os.Getenv("R2_BUCKET"),
		PublicURL:       strings.TrimRight(os.Getenv("R2_PUBLIC_URL"), "/"),
		Mock:            os.Getenv("R2_MOCK") == "1",
		LocalDir:        localDir,
		LocalPublicURL:  localPublic,
	}
}

func (c Config) R2Configured() bool {
	return c.AccountID != "" &&
		c.AccessKeyID != "" &&
		c.SecretAccessKey != "" &&
		c.Bucket != "" &&
		c.PublicURL != ""
}

func (c Config) UseLocal() bool {
	return !c.R2Configured() && !c.Mock && c.LocalDir != ""
}
