-- Enable Row Level Security on video_frames
ALTER TABLE public.video_frames ENABLE ROW LEVEL SECURITY;

-- Users can only view their own frames
CREATE POLICY "Users can view own frames"
ON public.video_frames
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own frames
CREATE POLICY "Users can insert own frames"
ON public.video_frames
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own frames
CREATE POLICY "Users can update own frames"
ON public.video_frames
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own frames
CREATE POLICY "Users can delete own frames"
ON public.video_frames
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);