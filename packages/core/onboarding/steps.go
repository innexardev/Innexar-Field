package onboarding

// Wizard step identifiers (ordered flow).
const (
	StepSignup   = "signup"
	StepIndustry = "industry"
	StepProfile  = "profile"
	StepModules  = "modules"
	StepSetup    = "setup"
	StepComplete = "complete"
)

// stepOrder defines valid progression through the wizard.
var stepOrder = []string{StepSignup, StepIndustry, StepProfile, StepModules, StepSetup, StepComplete}

func nextStep(current string) string {
	for i, s := range stepOrder {
		if s == current && i+1 < len(stepOrder) {
			return stepOrder[i+1]
		}
	}
	return current
}

func markCompleted(completed []string, step string) []string {
	for _, s := range completed {
		if s == step {
			return completed
		}
	}
	return append(completed, step)
}
