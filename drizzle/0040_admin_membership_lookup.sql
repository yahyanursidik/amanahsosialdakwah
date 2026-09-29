-- Admin organisasi dapat menambahkan pengguna yang sudah pernah masuk
-- (profil sudah ada) ke organisasinya berdasarkan email. Profil lintas
-- organisasi tidak terlihat lewat RLS, sehingga pencarian dilakukan oleh
-- fungsi terkontrol yang hanya dapat dipakai pemegang memberships.manage
-- dan hanya mengembalikan kecocokan email persis.

CREATE OR REPLACE FUNCTION private.lookup_profile_for_membership(p_organization_id uuid, p_email text)
RETURNS TABLE (id uuid, display_name text, email text, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF NOT private.has_permission(p_organization_id, 'memberships.manage') THEN
    RAISE EXCEPTION 'Tidak berwenang mencari pengguna.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT profile.id, profile.display_name, profile.email, profile.status
    FROM public.profiles profile
    WHERE lower(profile.email) = lower(trim(p_email))
    LIMIT 1;
END $$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.lookup_profile_for_membership(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.lookup_profile_for_membership(uuid, text) TO app_runtime;
