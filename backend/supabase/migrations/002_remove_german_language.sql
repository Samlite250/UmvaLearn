-- Remove German from all UmvaLearn language preferences and content metadata.
-- Existing German interface/input preferences fall back to English. Historical
-- nullable metadata is cleared rather than being mislabeled as another language.

UPDATE public.profiles SET interface_lang = 'en' WHERE interface_lang = 'de';
UPDATE public.profiles SET input_lang = 'en' WHERE input_lang = 'de';
UPDATE public.profiles SET output_lang = 'rw' WHERE output_lang = 'de';

UPDATE public.library_items SET source_lang = NULL WHERE source_lang = 'de';
UPDATE public.library_items SET target_lang = NULL WHERE target_lang = 'de';
UPDATE public.history SET source_lang = 'en' WHERE source_lang = 'de';
UPDATE public.history SET target_lang = NULL WHERE target_lang = 'de';
UPDATE public.admin_events SET source_lang = NULL WHERE source_lang = 'de';
UPDATE public.admin_events SET target_lang = NULL WHERE target_lang = 'de';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_interface_lang_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_input_lang_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_output_lang_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_interface_lang_check CHECK (interface_lang IN ('en', 'fr', 'rw')),
  ADD CONSTRAINT profiles_input_lang_check CHECK (input_lang IN ('en', 'fr', 'rw')),
  ADD CONSTRAINT profiles_output_lang_check CHECK (output_lang IN ('en', 'fr', 'rw'));

ALTER TABLE public.library_items
  DROP CONSTRAINT IF EXISTS library_items_source_lang_check,
  DROP CONSTRAINT IF EXISTS library_items_target_lang_check;
ALTER TABLE public.library_items
  ADD CONSTRAINT library_items_source_lang_check CHECK (source_lang IS NULL OR source_lang IN ('en', 'fr', 'rw')),
  ADD CONSTRAINT library_items_target_lang_check CHECK (target_lang IS NULL OR target_lang IN ('en', 'fr', 'rw'));

ALTER TABLE public.history
  DROP CONSTRAINT IF EXISTS history_source_lang_check,
  DROP CONSTRAINT IF EXISTS history_target_lang_check;
ALTER TABLE public.history
  ADD CONSTRAINT history_source_lang_check CHECK (source_lang IN ('en', 'fr', 'rw')),
  ADD CONSTRAINT history_target_lang_check CHECK (target_lang IS NULL OR target_lang IN ('en', 'fr', 'rw'));

ALTER TABLE public.admin_events
  DROP CONSTRAINT IF EXISTS admin_events_source_lang_check,
  DROP CONSTRAINT IF EXISTS admin_events_target_lang_check;
ALTER TABLE public.admin_events
  ADD CONSTRAINT admin_events_source_lang_check CHECK (source_lang IS NULL OR source_lang IN ('en', 'fr', 'rw')),
  ADD CONSTRAINT admin_events_target_lang_check CHECK (target_lang IS NULL OR target_lang IN ('en', 'fr', 'rw'));
