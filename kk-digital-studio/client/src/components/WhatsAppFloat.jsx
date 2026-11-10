import Icon from './Icon.jsx';
import { useSite } from '../context/SiteContext.jsx';

export default function WhatsAppFloat() {
  const { waLink, brand } = useSite();
  const href = waLink(`Hello ${brand}, I would like to make an enquiry.`);
  if (!href) return null;
  return (
    <a className="wa-float" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <Icon name="whatsapp" size={28} stroke={1.5} />
    </a>
  );
}
