import { createClient } from '@supabase/supabase-js';

// In a real-world scenario, you would get these values from environment variables
// Since this is a frontend-only app for now, we'll use valid placeholders
// These will be replaced after Supabase integration is set up
const supabaseUrl = 'https://placeholder-project.supabase.co';
const supabaseKey = 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  
  if (error) throw error;
  return data;
};

export const getFileUrl = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export const createVideoRecord = async (videoData: {
  user_id: string;
  video_url: string;
  gps_log_url: string;
  status: 'Queued' | 'Completed';
}) => {
  const { data, error } = await supabase
    .from('videos')
    .insert(videoData)
    .select('*')
    .single();
  
  if (error) throw error;
  return data;
};

export const saveCrackDetection = async (detection: {
  user_id: string;
  image_url: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  detection_json: any;
  has_crack: boolean;
}) => {
  const { data, error } = await supabase
    .from('crack_data')
    .insert(detection)
    .select('*')
    .single();
  
  if (error) throw error;
  return data;
};

export const getVideoRecords = async (userId: string, status?: 'Queued' | 'Completed') => {
  let query = supabase.from('videos').select('*').eq('user_id', userId);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const getDetections = async (userId: string, hasCrack?: boolean) => {
  let query = supabase.from('crack_data').select('*').eq('user_id', userId);
  
  if (hasCrack !== undefined) {
    query = query.eq('has_crack', hasCrack);
  }
  
  const { data, error } = await query.order('timestamp', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const updateVideoStatus = async (videoId: string, status: 'Queued' | 'Completed') => {
  const { data, error } = await supabase
    .from('videos')
    .update({ status })
    .eq('id', videoId)
    .select('*')
    .single();
  
  if (error) throw error;
  return data;
};
