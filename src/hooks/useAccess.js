import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAccess(userId) {
  const [access, setAccess] = useState({ hasPaidAccess: false, planStatus: 'free', planKind: null, loading: true });

  useEffect(() => {
    if (!userId) {
      setAccess({ hasPaidAccess: false, planStatus: 'free', planKind: null, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('v_user_access')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Access fetch error:', error);
        setAccess({ hasPaidAccess: false, planStatus: 'free', planKind: null, loading: false });
      } else {
        setAccess({
          hasPaidAccess: data?.has_paid_access ?? false,
          planStatus: data?.plan_status ?? 'free',
          planKind: data?.plan_kind ?? null,
          loading: false,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return access;
}
