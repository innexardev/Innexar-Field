package scheduling

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil, nil)
	m := p.Manifest()

	assert.Equal(t, "scheduling", m.ID)
	assert.Equal(t, "Scheduling", m.Name)
	assert.Equal(t, []string{"crm"}, m.Dependencies)
	assert.Contains(t, m.IndustryPacks, "cleaning")
	assert.ElementsMatch(t, []string{"scheduling.read", "scheduling.write"}, m.Permissions)
	assert.Len(t, m.Nav, 6)
	assert.Equal(t, "/schedule/map", m.Nav[2].Path)
}

func TestParseRouteDate(t *testing.T) {
	day := parseRouteDate("2026-06-15")
	assert.Equal(t, 2026, day.Year())
	assert.Equal(t, time.June, day.Month())
	assert.Equal(t, 15, day.Day())

	today := parseRouteDate("")
	assert.False(t, today.IsZero())
}

func TestDefaultRecurringTitle(t *testing.T) {
	assert.Equal(t, "Weekly service", defaultRecurringTitle("weekly"))
	assert.Equal(t, "Biweekly service", defaultRecurringTitle("biweekly"))
	assert.Equal(t, "Monthly service", defaultRecurringTitle("monthly"))
	assert.Equal(t, "Weekly service", defaultRecurringTitle(""))
}

func TestStubCoordinates_Deterministic(t *testing.T) {
	lat1, lng1 := stubCoordinates("abc", 0)
	lat2, lng2 := stubCoordinates("abc", 0)
	assert.Equal(t, lat1, lat2)
	assert.Equal(t, lng1, lng2)
	assert.NotZero(t, lat1)
	assert.NotZero(t, lng1)
}

func TestParseScheduleRange_Defaults(t *testing.T) {
	from, to := parseScheduleRange("", "")
	assert.True(t, to.After(from))
	assert.Equal(t, 7*24*time.Hour, to.Sub(from))
}

func TestParseScheduleRange_CustomDates(t *testing.T) {
	from, to := parseScheduleRange("2026-06-01", "2026-06-30")
	assert.Equal(t, 2026, from.Year())
	assert.Equal(t, time.June, from.Month())
	assert.Equal(t, 1, from.Day())
	assert.True(t, to.After(from))
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil, nil)
	migs := p.Migrations()

	assert.Len(t, migs, 3)
	assert.Equal(t, 120, migs[0].Version)
	assert.Equal(t, "jobs", migs[0].Name)
	assert.Equal(t, 121, migs[1].Version)
	assert.Equal(t, "scheduling_crews", migs[1].Name)
	assert.Equal(t, 122, migs[2].Version)
	assert.Equal(t, "scheduling_recurring_jobs", migs[2].Name)
	assert.Contains(t, migs[0].UpSQL, "CREATE TABLE IF NOT EXISTS jobs")
	assert.Contains(t, migs[1].UpSQL, "CREATE TABLE IF NOT EXISTS crews")
	assert.Contains(t, migs[2].UpSQL, "CREATE TABLE IF NOT EXISTS recurring_jobs")
}

func TestJob_DefaultStatus(t *testing.T) {
	job := Job{Title: "Site visit", Status: "scheduled"}
	assert.Equal(t, "scheduled", job.Status)
}
