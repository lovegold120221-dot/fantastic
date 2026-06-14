-- ========================
-- Migration 003: Fix chat FK constraints for arbitrary room names + anonymous users
-- ========================
-- chat_messages.meeting_id was UUID FK → public.meetings(id), but the app uses
-- arbitrary UUID room names from crypto.randomUUID() that never get a meetings row.
-- chat_messages.user_id was UUID FK → public.profiles(id), but anonymous users
-- don't have a Supabase profile and send their LiveKit identity (string) instead.
--
-- This migration makes both columns TEXT and removes the FK constraints.

-- Drop FK constraints first
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_meeting_id_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Change meeting_id from UUID → TEXT (room names are arbitrary strings)
ALTER TABLE public.chat_messages ALTER COLUMN meeting_id TYPE TEXT;
ALTER TABLE public.chat_messages ALTER COLUMN meeting_id SET NOT NULL;

-- Change user_id from UUID → TEXT (accepts auth UUIDs or anonymous peer-xxx identities)
ALTER TABLE public.chat_messages ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN user_id SET DEFAULT NULL;

-- Rebuild indexes for fast chat-history queries
DROP INDEX IF EXISTS idx_chat_messages_meeting;
CREATE INDEX idx_chat_messages_meeting ON public.chat_messages(meeting_id);
