import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { money as fmtMoney } from '../services/format.js';
import { DEFAULT_CONFIG } from '../../../server/services/defaults.js';
import { loadSiteConfig } from './siteConfig.js';

const SiteContext = createContext(null);
export const useSite = () => useContext(SiteContext);

const digits = (s) => String(s || '').replace(/\D/g, '');

export function SiteProvider({ children }) {
  const [state, setState] = useState({
    config: DEFAULT_CONFIG,
    payment: null,
    error: null,
    loading: true,
    usingFallback: false,
  });
  const activeLoad = useRef(null);

  const load = useCallback(() => {
    if (activeLoad.current) return activeLoad.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const request = loadSiteConfig((options) => api.get('/site', options)).then((result) => {
      if (result.usingFallback) {
        setState((current) => ({
          ...current,
          payment: null,
          error: result.error,
          loading: false,
          usingFallback: true,
        }));
      } else {
        setState({ ...result, loading: false, usingFallback: false });
      }
      return result;
    }).finally(() => {
      activeLoad.current = null;
    });
    activeLoad.current = request;
    return request;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const { config } = state;
    const contact = config?.contact;
    const waNumber = digits(contact?.whatsapp || contact?.phone);
    const telNumber = digits(contact?.phone || contact?.whatsapp);
    const symbol = config?.general?.currencySymbol || '₹';
    const mapQuery = contact?.mapQuery || contact?.address || '';
    return {
      ...state,
      reload: load,
      hasWhatsApp: Boolean(waNumber),
      hasPhone: Boolean(telNumber),
      /** WhatsApp deep link with an optional pre-filled message. Empty string when no number has been configured. */
      waLink: (text = '') => (waNumber ? `https://wa.me/${waNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}` : ''),
      telLink: () => (telNumber ? `tel:+${telNumber}` : ''),
      mapsLink: () => contact?.mapUrl || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : ''),
      mapsEmbed: () => contact?.mapEmbedUrl || (mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : ''),
      money: (n) => fmtMoney(n, symbol),
      symbol,
      brand: config?.general?.businessName || 'KK Digital Studio Frames & Gifts',
    };
  }, [state, load]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
