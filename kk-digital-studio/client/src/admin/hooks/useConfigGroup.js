import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';

/** Loads one site-config group for editing and saves it back as a whole (server sanitises and merges defaults). */
export function useConfigGroup(group) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: null, saved: null, payment: null });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { config, payment } = await api.get('/admin/config');
      setState({ loading: false, error: null, saved: config[group], payment });
      setDraft(JSON.parse(JSON.stringify(config[group])));
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [group]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => state.saved !== null && JSON.stringify(state.saved) !== JSON.stringify(draft), [state.saved, draft]);

  // warn before leaving the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  /** set(path, value) with dot paths, e.g. set('hero.heading', 'Hi') */
  const set = useCallback((path, value) => {
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d));
      const keys = path.split('.');
      let o = next;
      keys.slice(0, -1).forEach((k) => { if (o[k] === undefined || o[k] === null) o[k] = {}; o = o[k]; });
      o[keys[keys.length - 1]] = typeof value === 'function' ? value(o[keys[keys.length - 1]]) : value;
      return next;
    });
  }, []);

  const save = useCallback(async (override) => {
    setSaving(true);
    setSaveError('');
    try {
      const { value } = await api.put(`/admin/config/${group}`, override ?? draft);
      setState((s) => ({ ...s, saved: value }));
      setDraft(JSON.parse(JSON.stringify(value)));
      toast('Saved. Your website now shows these changes.');
      return value;
    } catch (e) {
      setSaveError(e.message);
      toast(e.message, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }, [group, draft, toast]);

  const reset = useCallback(() => setDraft(JSON.parse(JSON.stringify(state.saved))), [state.saved]);

  return { ...state, draft, set, setDraft, save, saving, saveError, dirty, reset, reload: load };
}
