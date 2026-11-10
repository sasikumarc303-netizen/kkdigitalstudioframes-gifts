import { useCallback, useEffect, useRef, useState } from 'react';
import { api, qs } from '../../services/api.js';

/** Paginated, searchable list loader for admin endpoints. `filters` is an object merged into the query string. */
export function usePaged(endpoint, { filters = {}, limit = 20, debounce = 300 } = {}) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [state, setState] = useState({ items: [], total: 0, pages: 1, extra: {}, loading: true, error: null });
  const seq = useRef(0);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, debounce);
    return () => clearTimeout(t);
  }, [q, debounce]);

  useEffect(() => { setPage(1); }, [filterKey]);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { items, total, pages, ...extra } = await api.get(`${endpoint}${qs({ ...filters, q: debouncedQ, page, limit })}`);
      if (id === seq.current) setState({ items, total, pages, extra, loading: false, error: null });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, filterKey, debouncedQ, page, limit]);

  useEffect(() => { load(); }, [load]);

  return { ...state, page, setPage, q, setQ, reload: load };
}
