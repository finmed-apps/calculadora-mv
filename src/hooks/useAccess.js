import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Estado de acesso calculado no servidor (RPC my_access, SECURITY DEFINER).
// state: 'admin' | 'active' | 'trial' | 'granted' | 'expired' | 'suspended' | 'not_allowed' | 'none'
const EMPTY = {
  hasAccess: false,
  state: 'none',
  isAdmin: false,
  allowed: false,
  isSuspended: false,
  cohort: null,
  trialEndsAt: null,
  accessUntil: null,
  effectiveEnd: null,
  daysLeft: null,
  planStatus: 'free',
  planKind: null,
  // compat com código antigo:
  hasPaidAccess: false,
  planRenewsAt: null,
  loading: true,
};

export function useAccess(userId) {
  const [access, setAccess] = useState(EMPTY);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAccess({ ...EMPTY, loading: false });
      return;
    }
    const { data, error } = await supabase.rpc('my_access');
    if (error) {
      console.error('Access fetch error:', error);
      setAccess({ ...EMPTY, loading: false });
      return;
    }
    const a = data || {};
    setAccess({
      hasAccess: a.has_access ?? false,
      state: a.state ?? 'none',
      isAdmin: a.is_admin ?? false,
      allowed: a.allowed ?? false,
      isSuspended: a.is_suspended ?? false,
      cohort: a.cohort ?? null,
      trialEndsAt: a.trial_ends_at ?? null,
      accessUntil: a.access_until ?? null,
      effectiveEnd: a.effective_end ?? null,
      daysLeft: a.days_left ?? null,
      planStatus: a.plan_status ?? 'free',
      planKind: a.plan_kind ?? null,
      // compat:
      hasPaidAccess: a.has_access ?? false,
      planRenewsAt: a.access_until ?? a.trial_ends_at ?? null,
      loading: false,
    });
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await refresh(); })();
    return () => { cancelled = true; };
  }, [refresh]);

  return { ...access, refresh };
}
