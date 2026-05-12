import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('Profile fetch error:', error);
    setProfile(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function update(fields) {
    if (!userId) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  async function uploadAvatar(file) {
    if (!userId || !file) throw new Error('Missing user or file');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar.${ext}`;

    // upload (upsert para substituir o anterior)
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;

    // public URL com cache-buster para forçar refresh do browser
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const urlWithBuster = `${publicUrl}?t=${Date.now()}`;

    await update({ avatar_url: urlWithBuster });
    return urlWithBuster;
  }

  return { profile, loading, update, uploadAvatar, refresh };
}
