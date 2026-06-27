package communications

import (
	"context"
	"fmt"
	"strings"

	"github.com/fieldforge/fieldforge/packages/integrations"
)

type SMSSendResult = integrations.TwilioSendResult

func (p *Plugin) sendSMS(ctx context.Context, to, body string) (*SMSSendResult, error) {
	to = strings.TrimSpace(to)
	body = strings.TrimSpace(body)
	if to == "" {
		return nil, fmt.Errorf("recipient phone required")
	}
	if body == "" {
		return nil, fmt.Errorf("message body required")
	}
	if p.twilio == nil {
		return &SMSSendResult{Mode: "log", Message: "SMS logged (Twilio not configured)", To: to, Body: body, Mock: true}, nil
	}
	return p.twilio.Send(ctx, integrations.TwilioSendRequest{To: to, Body: body})
}

func (p *Plugin) smsAvailable(ctx context.Context) bool {
	return p.twilio != nil && p.twilio.Available(ctx)
}

func (p *Plugin) SetSMSDeps(twilio integrations.TwilioSender) {
	p.twilio = twilio
}
