package communications

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"github.com/fieldforge/fieldforge/packages/core/config"
	"github.com/fieldforge/fieldforge/packages/core/platform"
	"github.com/fieldforge/fieldforge/packages/core/platformsettings"
)

type SendResult struct {
	Mode    string `json:"mode"`
	Message string `json:"message"`
	To      string `json:"to"`
	Subject string `json:"subject"`
}

func (p *Plugin) sendEmail(ctx context.Context, to, subject, bodyHTML string) (*SendResult, error) {
	to = strings.TrimSpace(strings.ToLower(to))
	if to == "" {
		return nil, fmt.Errorf("recipient email required")
	}

	if p.shouldLogOnly() {
		log.Printf("communications email (log only): to=%s subject=%q body_len=%d", to, subject, len(bodyHTML))
		return &SendResult{
			Mode:    "log",
			Message: "Email logged (SMTP not configured or skip_email_send enabled)",
			To:      to,
			Subject: subject,
		}, nil
	}

	host, port, username, password, from, ok := p.resolveSMTP(ctx)
	if !ok {
		log.Printf("communications email (log only): to=%s subject=%q body_len=%d", to, subject, len(bodyHTML))
		return &SendResult{
			Mode:    "log",
			Message: "Email logged (SMTP not configured or disabled)",
			To:      to,
			Subject: subject,
		}, nil
	}

	addr := host + ":" + port
	msg := buildMIME(from, to, subject, bodyHTML)
	auth := smtp.PlainAuth("", username, password, host)
	if err := smtp.SendMail(addr, auth, from, []string{to}, []byte(msg)); err != nil {
		return nil, fmt.Errorf("send email: %w", err)
	}

	return &SendResult{
		Mode:    "smtp",
		Message: "Email sent via SMTP",
		To:      to,
		Subject: subject,
	}, nil
}

func (p *Plugin) shouldLogOnly() bool {
	if p.cfg == nil {
		return true
	}
	if skipEmail, ok := p.cfg.Debug.Features["skip_email_send"].(bool); ok && skipEmail {
		return true
	}
	return false
}

func (p *Plugin) resolveSMTP(ctx context.Context) (host, port, username, password, from string, ok bool) {
	if p.settings == nil {
		return "", "", "", "", "", false
	}
	enabled := smtpBool(p.settings.Resolve(ctx, platform.SettingSMTP, "enabled", "SMTP_ENABLED"))
	if !enabled {
		return "", "", "", "", "", false
	}
	host = strings.TrimSpace(p.settings.Resolve(ctx, platform.SettingSMTP, "host", "SMTP_HOST"))
	port = strings.TrimSpace(p.settings.Resolve(ctx, platform.SettingSMTP, "port", "SMTP_PORT"))
	if port == "" {
		port = "587"
	}
	username = p.settings.Resolve(ctx, platform.SettingSMTP, "username", "SMTP_USERNAME")
	password = p.settings.Resolve(ctx, platform.SettingSMTP, "password", "SMTP_PASSWORD")
	from = strings.TrimSpace(p.settings.Resolve(ctx, platform.SettingSMTP, "from_email", "SMTP_FROM_EMAIL"))
	if host == "" || from == "" {
		return "", "", "", "", "", false
	}
	return host, port, username, password, from, true
}

func smtpBool(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func buildMIME(from, to, subject, bodyHTML string) string {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("\r\n")
	b.WriteString(bodyHTML)
	return b.String()
}

// SetMailDeps wires platform SMTP settings for transactional email.
func (p *Plugin) SetMailDeps(settings *platformsettings.Store, cfg *config.AppConfig) {
	p.settings = settings
	p.cfg = cfg
}
