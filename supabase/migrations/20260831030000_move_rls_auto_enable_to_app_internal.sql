-- ============================================================
-- Security Hardening: Isolate Event Trigger Function into app_internal
--
-- Fixes Supabase Security Linter Warnings 0028 & 0029:
-- Moves rls_auto_enable() from 'public' (exposed to PostgREST RPC)
-- into private schema 'app_internal' and revokes public execution rights.
-- ============================================================

-- 1. Drop existing event trigger and public function
DROP EVENT TRIGGER IF EXISTS ensure_rls;
DROP FUNCTION IF EXISTS public.rls_auto_enable();

-- 2. Recreate in private schema app_internal
CREATE OR REPLACE FUNCTION app_internal.rls_auto_enable()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL
        AND cmd.schema_name IN ('public')
        AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema', 'app_internal')
        AND cmd.schema_name NOT LIKE 'pg_toast%'
        AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

-- 3. Restrict execution permissions strictly to internal roles
REVOKE ALL ON FUNCTION app_internal.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_internal.rls_auto_enable() TO postgres, service_role;

-- 4. Recreate event trigger pointing to app_internal
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION app_internal.rls_auto_enable();
