-- P5 / B27: a tenant must be able to present itself as itself.
-- tenants carried only name and slug, so every tenant saw the same product with no way to show
-- its own identity. These columns are nullable on purpose: NULL means "not configured yet" and the
-- API reports the defaults it actually used rather than pretending a value was set.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_email text;

COMMENT ON COLUMN tenants.display_name IS
  'Brand shown in the product UI; falls back to name when unset.';
COMMENT ON COLUMN tenants.primary_color IS
  'Hex brand colour; NULL means the platform default was applied, and the API says so.';
