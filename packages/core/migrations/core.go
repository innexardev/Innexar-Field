package migrations

// Core platform migrations (version 1-99).
var Core = []struct {
	Version int
	Name    string
	UpSQL   string
}{
	{
		Version: 1,
		Name:    "extensions",
		UpSQL: `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
`,
	},
	{
		Version: 2,
		Name:    "tenants",
		UpSQL: `
CREATE TABLE IF NOT EXISTS tenants (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	industry_pack TEXT NOT NULL DEFAULT 'field-services',
	plan_id TEXT NOT NULL DEFAULT 'starter',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`,
	},
	{
		Version: 3,
		Name:    "users",
		UpSQL: `
CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	email TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'owner',
	first_name TEXT NOT NULL DEFAULT '',
	last_name TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 4,
		Name:    "tenant_plugins",
		UpSQL: `
CREATE TABLE IF NOT EXISTS tenant_plugins (
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	plugin_id TEXT NOT NULL,
	enabled BOOLEAN NOT NULL DEFAULT true,
	PRIMARY KEY (tenant_id, plugin_id)
);
ALTER TABLE tenant_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_plugins FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_plugins_isolation ON tenant_plugins;
CREATE POLICY tenant_plugins_isolation ON tenant_plugins
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 5,
		Name:    "domain_events",
		UpSQL: `
CREATE TABLE IF NOT EXISTS domain_events (
	id UUID PRIMARY KEY,
	tenant_id UUID NOT NULL,
	event_type TEXT NOT NULL,
	payload JSONB NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	processed_at TIMESTAMPTZ,
	status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_domain_events_pending ON domain_events (status, created_at) WHERE status = 'pending';
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS domain_events_isolation ON domain_events;
CREATE POLICY domain_events_isolation ON domain_events
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 6,
		Name:    "tenant_billing",
		UpSQL: `
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing';
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
`,
	},
	{
		Version: 7,
		Name:    "onboarding_state",
		UpSQL: `
CREATE TABLE IF NOT EXISTS onboarding_state (
	tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
	current_step TEXT NOT NULL DEFAULT 'industry',
	completed_steps JSONB NOT NULL DEFAULT '["signup"]',
	industry_packs JSONB NOT NULL DEFAULT '[]',
	profile JSONB NOT NULL DEFAULT '{}',
	modules JSONB NOT NULL DEFAULT '[]',
	setup_skipped BOOLEAN NOT NULL DEFAULT false,
	completed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS onboarding_state_isolation ON onboarding_state;
CREATE POLICY onboarding_state_isolation ON onboarding_state
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 8,
		Name:    "idempotency_keys",
		UpSQL: `
CREATE TABLE IF NOT EXISTS idempotency_keys (
	key TEXT NOT NULL,
	tenant_id UUID NOT NULL,
	path TEXT NOT NULL DEFAULT '',
	method TEXT NOT NULL DEFAULT 'POST',
	status_code INT NOT NULL DEFAULT 200,
	response JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (tenant_id, key)
);
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS path TEXT NOT NULL DEFAULT '';
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'POST';
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS status_code INT NOT NULL DEFAULT 200;
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys (created_at);
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idempotency_keys_isolation ON idempotency_keys;
CREATE POLICY idempotency_keys_isolation ON idempotency_keys
	USING (
		current_setting('app.worker', true) = 'true'
		OR tenant_id = current_setting('app.tenant_id', true)::uuid
	);
`,
	},
	{
		Version: 9,
		Name:    "domain_events_worker_policy",
		UpSQL: `
DROP POLICY IF EXISTS domain_events_isolation ON domain_events;
CREATE POLICY domain_events_isolation ON domain_events
	USING (
		current_setting('app.worker', true) = 'true'
		OR tenant_id = current_setting('app.tenant_id', true)::uuid
	);
`,
	},
	{
		Version: 10,
		Name:    "tenant_integrations",
		UpSQL: `
CREATE TABLE IF NOT EXISTS tenant_integrations (
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	integration_id TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'disconnected',
	external_id TEXT,
	metadata JSONB NOT NULL DEFAULT '{}',
	connected_at TIMESTAMPTZ,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (tenant_id, integration_id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_status ON tenant_integrations (tenant_id, status);
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_integrations_isolation ON tenant_integrations;
CREATE POLICY tenant_integrations_isolation ON tenant_integrations
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 11,
		Name:    "tenant_feature_flags",
		UpSQL: `
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}';
`,
	},
	{
		Version: 12,
		Name:    "find_user_by_email",
		UpSQL: `
CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS TABLE (
	id UUID,
	tenant_id UUID,
	password_hash TEXT,
	role TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
	SELECT u.id, u.tenant_id, u.password_hash, u.role
	FROM users u
	WHERE u.email = p_email
	LIMIT 1;
$$;
`,
	},
	{
		Version: 15,
		Name:    "tenant_signup_attribution",
		UpSQL: `
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS signup_attribution JSONB NOT NULL DEFAULT '{}';
`,
	},
	{
		Version: 16,
		Name:    "processed_events",
		UpSQL: `
CREATE TABLE IF NOT EXISTS processed_events (
	event_id UUID NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
	consumer_name TEXT NOT NULL,
	processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	tenant_id UUID NOT NULL,
	PRIMARY KEY (event_id, consumer_name)
);
CREATE INDEX IF NOT EXISTS idx_processed_events_tenant ON processed_events (tenant_id);
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS processed_events_isolation ON processed_events;
CREATE POLICY processed_events_isolation ON processed_events
	USING (
		current_setting('app.worker', true) = 'true'
		OR tenant_id = current_setting('app.tenant_id', true)::uuid
	);
`,
	},
	{
		Version: 17,
		Name:    "users_worker_policy",
		UpSQL: `
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
	USING (
		current_setting('app.worker', true) = 'true'
		OR tenant_id = current_setting('app.tenant_id', true)::uuid
	);
`,
	},
	{
		Version: 19,
		Name:    "notifications",
		UpSQL: `
CREATE TABLE IF NOT EXISTS notifications (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	type TEXT NOT NULL DEFAULT 'general',
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	read_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (tenant_id, user_id, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_tenant ON notifications;
CREATE POLICY notifications_tenant ON notifications
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 20,
		Name:    "tenant_support_tickets",
		UpSQL: `
CREATE TABLE IF NOT EXISTS tenant_support_tickets (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	subject TEXT NOT NULL,
	message TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT tenant_support_tickets_status_check CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);
CREATE INDEX IF NOT EXISTS idx_tenant_support_tickets_user ON tenant_support_tickets (tenant_id, user_id, created_at DESC);
ALTER TABLE tenant_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_support_tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_support_tickets_tenant ON tenant_support_tickets;
CREATE POLICY tenant_support_tickets_tenant ON tenant_support_tickets
	USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
`,
	},
	{
		Version: 21,
		Name:    "tenant_plugins_accounting_backfill",
		UpSQL: `
INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled)
SELECT t.id, 'accounting', true
FROM tenants t
WHERE t.industry_pack = 'field-services'
ON CONFLICT (tenant_id, plugin_id) DO UPDATE SET enabled = true;

INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled)
SELECT t.id, 'accounting', true
FROM tenants t
WHERE t.plan_id IN ('business', 'pro', 'enterprise')
ON CONFLICT (tenant_id, plugin_id) DO UPDATE SET enabled = true;

INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled)
SELECT DISTINCT tp.tenant_id, 'accounting', true
FROM tenant_plugins tp
WHERE tp.plugin_id IN ('expenses', 'payroll') AND tp.enabled = true
ON CONFLICT (tenant_id, plugin_id) DO UPDATE SET enabled = true;

INSERT INTO tenant_plugins (tenant_id, plugin_id, enabled)
SELECT os.tenant_id, 'accounting', true
FROM onboarding_state os
WHERE os.modules @> '["accounting"]'::jsonb
ON CONFLICT (tenant_id, plugin_id) DO UPDATE SET enabled = true;
`,
	},
}
