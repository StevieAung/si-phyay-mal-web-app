
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  refs jsonb,
  disclaimer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_profile_created_idx
  ON public.chat_messages (profile_id, created_at);

GRANT SELECT, INSERT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Deny direct reads; owner-scoped access goes through the security-definer RPC.
CREATE POLICY "Deny direct chat reads"
  ON public.chat_messages FOR SELECT
  TO anon, authenticated
  USING (false);

-- Anyone in the demo flow can insert as long as they attach a profile_id.
CREATE POLICY "Anon can insert chat with a profile"
  ON public.chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (profile_id IS NOT NULL);

-- Owner-scoped read: caller must supply matching profile id + phone.
CREATE OR REPLACE FUNCTION public.get_chat_messages(_id uuid, _phone text)
RETURNS TABLE(id uuid, role text, content text, refs jsonb, disclaimer text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _id IS NULL OR _phone IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _id AND p.phone = _phone) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT m.id, m.role, m.content, m.refs, m.disclaimer, m.created_at
    FROM public.chat_messages m
    WHERE m.profile_id = _id
    ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_chat_messages(_id uuid, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _id IS NULL OR _phone IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _id AND p.phone = _phone) THEN
    RETURN;
  END IF;
  DELETE FROM public.chat_messages WHERE profile_id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_messages(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.clear_chat_messages(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_chat_messages(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_chat_messages(uuid, text) TO anon, authenticated;
