-- New projects may require explicit Data API grants in addition to RLS policies.
revoke all on public.tenants, public.tenant_memberships, public.tenant_ai_settings,
  public.profiles, public.form_folders, public.forms, public.form_sections,
  public.form_questions, public.form_rules, public.participants, public.form_submissions,
  public.form_answers, public.manual_reviews, public.ai_evaluation_rules,
  public.ai_evaluations, public.phone_verifications, public.submission_files
  from public, anon, authenticated;

grant select on public.tenants, public.forms, public.form_sections,
  public.form_questions, public.form_rules to anon;

grant select, insert, update, delete on public.tenants, public.tenant_memberships,
  public.form_folders, public.forms, public.form_sections, public.form_questions,
  public.form_rules, public.participants, public.form_answers, public.manual_reviews,
  public.ai_evaluation_rules, public.ai_evaluations, public.phone_verifications,
  public.submission_files to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, update, delete on public.form_submissions to authenticated;

grant select, insert, update, delete on public.tenants, public.tenant_memberships,
  public.tenant_ai_settings, public.profiles, public.form_folders, public.forms,
  public.form_sections, public.form_questions, public.form_rules, public.participants,
  public.form_submissions, public.form_answers, public.manual_reviews,
  public.ai_evaluation_rules, public.ai_evaluations, public.phone_verifications,
  public.submission_files to service_role;
