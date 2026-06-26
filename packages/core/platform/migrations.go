package platform

import "github.com/fieldforge/fieldforge/packages/core/plugin"

// Migrations defines platform-scoped schema (no tenant_id, no RLS).
// Access is enforced in application middleware (RequirePlatformAdmin), not row policies.
func Migrations() []plugin.Migration {
	return []plugin.Migration{
		{Version: 13, Name: "platform_admin", UpSQL: platformAdminSQL},
		{Version: 14, Name: "platform_admin_role", UpSQL: platformAdminRoleSQL},
	}
}

const platformAdminSQL = `
-- Platform operators are global (not tenant-scoped). No RLS — app-layer auth only.
CREATE TABLE IF NOT EXISTS platform_admins (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_plans (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	price_monthly_cents BIGINT,
	stripe_price_id TEXT,
	features JSONB NOT NULL DEFAULT '[]',
	active BOOLEAN NOT NULL DEFAULT true,
	sort_order INT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_promotions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	code TEXT NOT NULL UNIQUE,
	description TEXT NOT NULL DEFAULT '',
	discount_percent INT,
	discount_cents BIGINT,
	plan_id TEXT REFERENCES platform_plans(id) ON DELETE SET NULL,
	starts_at TIMESTAMPTZ,
	ends_at TIMESTAMPTZ,
	max_redemptions INT,
	redemption_count INT NOT NULL DEFAULT 0,
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_promotions_active ON platform_promotions (active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS landing_content_blocks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	section TEXT NOT NULL,
	block_key TEXT NOT NULL DEFAULT 'default',
	content JSONB NOT NULL DEFAULT '{}',
	active BOOLEAN NOT NULL DEFAULT true,
	sort_order INT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (section, block_key)
);
CREATE INDEX IF NOT EXISTS idx_landing_content_section ON landing_content_blocks (section, sort_order);

CREATE TABLE IF NOT EXISTS platform_config (
	id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
	brand_overrides JSONB NOT NULL DEFAULT '{}',
	feature_flags JSONB NOT NULL DEFAULT '{}',
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO platform_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_audit_log (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	admin_id UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
	action TEXT NOT NULL,
	resource_type TEXT NOT NULL,
	resource_id TEXT,
	details JSONB NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created ON platform_audit_log (created_at DESC);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION find_platform_admin_by_email(p_email TEXT)
RETURNS TABLE (
	id UUID,
	password_hash TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
	SELECT pa.id, pa.password_hash
	FROM platform_admins pa
	WHERE pa.email = p_email
	LIMIT 1;
$$;
`

const platformAdminRoleSQL = `
ALTER TABLE platform_admins
	ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin'
		CHECK (role IN ('super_admin', 'support'));
ALTER TABLE platform_admins
	ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE platform_admins
	ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS find_platform_admin_by_email(TEXT);

CREATE OR REPLACE FUNCTION find_platform_admin_by_email(p_email TEXT)
RETURNS TABLE (
	id UUID,
	password_hash TEXT,
	role TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
	SELECT pa.id, pa.password_hash, COALESCE(pa.role, 'super_admin')
	FROM platform_admins pa
	WHERE pa.email = p_email AND pa.disabled = false
	LIMIT 1;
$$;
`
