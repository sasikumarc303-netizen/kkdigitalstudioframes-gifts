import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { money as fmtMoney } from '../services/format.js';

const SiteContext = createContext(null);
export const useSite = () => useContext(SiteContext);

const digits = (s) => String(s || '').replace(/\D/g, '');

export function SiteProvider({ children }) {
  const [state, setState] = useState({ config: null, payment: null, error: null, loading: true });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return api
      .get('/site')
      .then(({ config, payment }) => setState({ config, payment, error: null, loading: false }))
      .catch((error) => setState({ config: null, payment: null, error, loading: false }));
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
      mapsLink: () => (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : ''),
      mapsEmbed: () => (mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : ''),
      money: (n) => fmtMoney(n, symbol),
      symbol,
      brand: config?.general?.businessName || 'KK Digital Studio',
    };
  }, [state, load]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
