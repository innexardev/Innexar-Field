package cleaning

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlugin_Manifest(t *testing.T) {
	p := New(nil)
	m := p.Manifest()

	assert.Equal(t, "cleaning", m.ID)
	assert.Equal(t, "Cleaning", m.Name)
	assert.Equal(t, []string{"crm", "scheduling"}, m.Dependencies)
	assert.Equal(t, []string{"cleaning"}, m.IndustryPacks)
	assert.ElementsMatch(t, []string{"cleaning.read", "cleaning.write"}, m.Permissions)
	assert.Len(t, m.Nav, 5)
}

func TestPlugin_Migrations(t *testing.T) {
	p := New(nil)
	migs := p.Migrations()

	assert.Len(t, migs, 5)
	assert.Equal(t, 170, migs[0].Version)
	assert.Equal(t, "cleaning_recurring_cleans", migs[0].Name)
	assert.Equal(t, 171, migs[1].Version)
	assert.Equal(t, "cleaning_phases", migs[1].Name)
	assert.Equal(t, 172, migs[2].Version)
	assert.Equal(t, "cleaning_checklists", migs[2].Name)
	assert.Equal(t, 173, migs[3].Version)
	assert.Equal(t, "cleaning_qc_photos", migs[3].Name)
	assert.Equal(t, 174, migs[4].Version)
	assert.Equal(t, "cleaning_supplies", migs[4].Name)
}

func TestIsValidPhase(t *testing.T) {
	tests := []struct {
		phase string
		want  bool
	}{
		{"rough", true},
		{"final", true},
		{"premium", true},
		{"", false},
		{"invalid", false},
		{"FINAL", false},
	}
	for _, tt := range tests {
		t.Run(tt.phase, func(t *testing.T) {
			assert.Equal(t, tt.want, isValidPhase(tt.phase))
		})
	}
}

func TestIsValidFrequency(t *testing.T) {
	tests := []struct {
		freq string
		want bool
	}{
		{"weekly", true},
		{"biweekly", true},
		{"monthly", true},
		{"daily", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.freq, func(t *testing.T) {
			assert.Equal(t, tt.want, isValidFrequency(tt.freq))
		})
	}
}
