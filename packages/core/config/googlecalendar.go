package config

func (c *AppConfig) MockGoogleCalendar() bool {
	if f, ok := c.Debug.Features["mock_google_calendar"].(bool); ok {
		return f
	}
	return false
}
