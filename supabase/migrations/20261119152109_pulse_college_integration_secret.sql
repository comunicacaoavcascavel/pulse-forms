CREATE FUNCTION public.college_forms_integration_secret()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT decrypted_secret FROM vault.decrypted_secrets
    WHERE name = 'pulse_college_forms_integration'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.college_forms_integration_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.college_forms_integration_secret() TO service_role;
