-- Enable realtime for session_participants table
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

-- Verify the publication was added
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('messages', 'session_participants');

-- Check RLS policies for session_participants
SELECT * FROM pg_policies WHERE tablename = 'session_participants';