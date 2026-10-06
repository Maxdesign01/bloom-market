-- ============================================================
-- Bloom Market — Auth email notification tracking columns (0009)
--
-- Why this migration exists:
--   Tracks when welcome and login notification emails are sent
--   to users, allowing the backend to distinguish new Google accounts
--   from returning logins and prevent duplicate notifications.
-- ============================================================

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists last_login_notified_at timestamptz;

