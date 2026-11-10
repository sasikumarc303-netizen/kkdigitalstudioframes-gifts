const PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.76L20 8H6.2M9.5 20.5h.01M16.5 20.5h.01',
  phone: 'M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 5.9 5.9l1.3-2 4 1.6V18a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
  whatsapp: 'M20 11.5a8.4 8.4 0 0 1-12.4 7.4L3.5 20l1.2-4A8.4 8.4 0 1 1 20 11.5zM9 8.5c.2 3.2 2.800 5.800 6 6l1.200-1.200-1.800-.9-.9.7c-1-.4-1.900-1.300-2.300-2.300l.7-.9-.9-1.800z',
  pin: 'M12 21s7-6.100 7-11.200A7 7 0 0 0 5 9.800C5 14.900 12 21 12 21zM12 12.300a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v5M14 11v5',
  zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M11 8v6M8 11h6',
  pause: 'M9 6v12M15 6v12',
  play: 'M8 5l11 7-11 7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.200 6.800h.01',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8.500a.5.500 0 0 1 .5-.5z',
  youtube: 'M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9v6l5-3z',
  x: 'M4 4l16 16M20 4L4 20',
  camera: 'M4 8h3l1.500-2h7L17 8h3v11H4zM12 17a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7z',
  frame: 'M4 4h16v16H4zM8 8h8v8H8z',
  heart: 'M12 20s-7-4.400-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.600-7 10-7 10z',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4 5',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1-3-5-3-4.500-.5C7.800 8 12 7 12 7zm0 0c1-3 5-3 4.500-.5C16.200 8 12 7 12 7z',
  id: 'M4 6h16v12H4zM8 11a2 2 0 1 0 0-.1M13 10h5M13 14h4M6 16c.5-1.500 3.500-1.500 4 0',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  building: 'M5 21V5l7-2v18M12 8l7 2v11M3 21h18M8 8h1M8 12h1M8 16h1',
  school: 'M3 9l9-5 9 5-9 5zM7 11.500V16c0 1.500 2.500 3 5 3s5-1.500 5-3v-4.500',
  star: 'M12 3.500l2.600 5.300 5.800.8-4.200 4.100 1 5.800L12 16.700l-5.200 2.800 1-5.800L3.600 9.600l5.800-.8z',
  dashboard: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z',
  home: 'M4 11l8-7 8 7v9H5v-9zM10 20v-6h4v6',
  video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.500h.01',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  tag: 'M3 12V4h8l10 10-8 8zM7.500 8h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  inbox: 'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5',
  quote: 'M5 17c0-4 1-7 4-9M13 17c0-4 1-7 4-9M5 17h4v-4H5zM13 17h4v-4h-4z',
  link: 'M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.200l2-1.500-2-3.400-2.300.9a7 7 0 0 0-2-1.200L14.200 3h-4l-.4 2.600a7 7 0 0 0-2 1.200l-2.300-.9-2 3.400 2 1.500a7 7 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-.9a7 7 0 0 0 2 1.200l.4 2.600h4l.4-2.600a7 7 0 0 0 2-1.200l2.300.9 2-3.400-2-1.500c.1-.4.100-.8.100-1.200z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  shield: 'M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z',
  logs: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h4',
  logout: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 6.2A9.500 9.500 0 0 1 12 6c5.500 0 9 6 9 6a15 15 0 0 1-3 3.600M6.600 7.600A15 15 0 0 0 3 12s3.500 6 9 6a9 9 0 0 0 3.400-.7M9.900 10a3 3 0 0 0 4.100 4.100',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7zM7 19a1.500 1.500 0 1 0 0-.1M17 19a1.500 1.500 0 1 0 0-.1',
};

export default function Icon({ name, size = 20, stroke = 1.6, className = '', ...rest }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
