// Default site content & settings. Stored values (edited in the admin panel) are merged over these.
// Nothing here is a made-up business fact: no phone numbers, prices, reviews or opening hours are invented.

export const DEFAULT_CONFIG = {
  general: {
    businessName: 'KK Digital Studio',
    tagline: 'Professional Photography Studio',
    logo: '',
    favicon: '',
    footerText: 'Professional photography, photo printing and framing from Achamangalam, Tirupathur.',
    currency: 'INR',
    currencySymbol: '₹',
  },
  contact: {
    phone: '',
    whatsapp: '',
    email: '',
    address: 'Achamangalam, Tirupathur, Tamil Nadu 635651, India',
    mapQuery: '',
    hours: [],
    social: { instagram: '', facebook: '', youtube: '', x: '' },
  },
  commerce: {
    allowCod: false,
    allowPickup: true,
    paymentInstructions: 'Place your order and our team will contact you to confirm availability and arrange payment.',
    flatShipping: 0,
    freeShippingAbove: 0,
  },
  navigation: [
    { label: 'Home', path: '/', visible: true },
    { label: 'About', path: '/about', visible: true },
    { label: 'Services', path: '/services', visible: true },
    { label: 'Portfolio', path: '/portfolio', visible: true },
    { label: 'Packages', path: '/packages', visible: true },
    { label: 'Photo Frames', path: '/photo-frames', visible: true },
    { label: 'Contact', path: '/contact', visible: true },
  ],
  homepage: {
    hero: {
      eyebrow: 'KK Digital Studio · Tirupathur',
      heading: 'WE CAPTURE YOUR MOMENTS.',
      subheading: 'Every photograph tells a story. Let us preserve yours forever.',
      video: '/videos/hero.mp4',
      videoMobile: '/videos/hero-mobile.mp4',
      poster: '/images/hero-poster.jpg',
      posterMobile: '/images/hero-poster-mobile.jpg',
    },
    ctas: [
      { label: 'BOOK YOUR SESSION', type: 'route', target: '/booking', variant: 'primary', visible: true },
      { label: 'EXPLORE PORTFOLIO', type: 'route', target: '/portfolio', variant: 'secondary', visible: true },
      { label: 'WHATSAPP US', type: 'whatsapp', target: '', variant: 'ghost', visible: true },
    ],
    sections: {
      intro: {
        visible: true,
        eyebrow: 'Welcome to the studio',
        title: 'Where every frame is composed with care',
        text: 'KK Digital Studio is a photography studio in Achamangalam, Tirupathur. From weddings and portraits to passport photos, prints and handcrafted frames, we turn your moments into images you will want to keep for a lifetime.',
        image: '/images/studio-camera-warm.jpg',
      },
      about: {
        visible: true,
        eyebrow: 'About KK Digital Studio',
        title: 'Photography with a personal touch',
        text: 'We believe a photograph should feel like the moment it remembers. Our approach is calm, collaborative and detail-oriented, so you can relax in front of the camera and see yourself at your most natural.',
        image: '/images/studio-camera-sage.jpg',
        points: ['Portraits, weddings, families and events', 'Printing and framing under one roof', 'Clear communication from booking to delivery'],
      },
      services: { visible: true, eyebrow: 'What we do', title: 'Photography services', subtitle: 'From milestone celebrations to everyday portraits, explore the ways we can capture your story.' },
      portfolio: { visible: true, eyebrow: 'Selected work', title: 'Featured portfolio', subtitle: 'A glimpse of the stories we have had the privilege to photograph.' },
      experience: {
        visible: true,
        eyebrow: 'Our photography experience',
        title: 'Relaxed, guided and unhurried',
        text: 'Every session follows a simple, comfortable flow, so you always know what happens next.',
        image: '/images/studio-lens-aperture.jpg',
        video: '',
        steps: [
          { title: 'Tell us your story', text: 'Share the occasion, the mood and the people who matter. We plan around you.' },
          { title: 'Plan the session', text: 'We agree on the date, location and style, and answer every question beforehand.' },
          { title: 'The shoot', text: 'We guide poses and light gently so the result feels natural, not staged.' },
          { title: 'Edit, print & frame', text: 'Your selected photographs are refined and can be printed and framed in-house.' },
        ],
      },
      packages: { visible: true, eyebrow: 'Packages', title: 'Popular packages', subtitle: 'Choose a starting point and we will tailor it to your occasion.' },
      frames: { visible: true, eyebrow: 'Photo frame collection', title: 'Make your memories part of your home', subtitle: 'Premium frames, plaques and keepsakes crafted for your favourite photographs.' },
      why: {
        visible: true,
        eyebrow: 'Why choose us',
        title: 'Considered from first hello to final print',
        items: [
          { title: 'Personal attention', text: 'You work directly with the people behind the camera.' },
          { title: 'Print & frame in-house', text: 'Photography, printing and framing handled together for consistent quality.' },
          { title: 'Easy booking', text: 'Book online or message us on WhatsApp and we will confirm personally.' },
          { title: 'Every occasion', text: 'Weddings, portraits, products, schools and events, all in one studio.' },
        ],
      },
      testimonials: { visible: true, eyebrow: 'Kind words', title: 'What our clients say' },
      booking: { visible: true, title: 'Ready to create something beautiful?', text: 'Tell us about your occasion and preferred date. We will get back to you to confirm your session.' },
      contact: { visible: true, eyebrow: 'Visit & contact', title: 'Find us in Achamangalam' },
    },
    featuredServices: [],
    featuredProducts: [],
  },
  seo: {
    defaultOgImage: '/images/hero-poster.jpg',
    robotsTxt: '',
    pages: {
      '/': { title: 'KK Digital Studio | Photography Studio in Tirupathur', description: 'Professional photography, photo printing and framing in Achamangalam, Tirupathur, Tamil Nadu. Book your session today.', ogImage: '' },
      '/about': { title: 'About | KK Digital Studio', description: 'Meet KK Digital Studio, a photography studio creating portraits, weddings, family stories and keepsake prints in Tirupathur.', ogImage: '' },
      '/services': { title: 'Photography Services | KK Digital Studio', description: 'Wedding, pre-wedding, portrait, family, event, product and passport photography, plus printing, framing and album design.', ogImage: '' },
      '/portfolio': { title: 'Portfolio | KK Digital Studio', description: 'Browse our photography portfolio across weddings, portraits, families and events.', ogImage: '' },
      '/packages': { title: 'Photography Packages | KK Digital Studio', description: 'Explore photography packages from KK Digital Studio and enquire for a tailored quote.', ogImage: '' },
      '/photo-frames': { title: 'Photo Frames & Keepsakes | KK Digital Studio', description: 'Custom photo frames, wall collage frames, heart plaques and LED photo lamps in Oak, Acrylic and Metal finishes.', ogImage: '' },
      '/booking': { title: 'Book a Session | KK Digital Studio', description: 'Request your photography session with KK Digital Studio. We will confirm your booking personally.', ogImage: '' },
      '/contact': { title: 'Contact & Location | KK Digital Studio', description: 'Contact KK Digital Studio in Achamangalam, Tirupathur. Call, WhatsApp or send an enquiry.', ogImage: '' },
      '/cart': { title: 'Your Cart | KK Digital Studio', description: 'Review your photo frame order.', ogImage: '' },
      '/checkout': { title: 'Checkout | KK Digital Studio', description: 'Complete your photo frame order.', ogImage: '' },
    },
  },
};

// Shapes of array items, used to whitelist keys when saving configuration from the admin panel.
export const ARRAY_SHAPES = {
  navigation: { label: '', path: '', visible: true },
  'contact.hours': { days: '', time: '' },
  'homepage.ctas': { label: '', type: 'route', target: '', variant: 'primary', visible: true },
  'homepage.sections.about.points': '',
  'homepage.sections.experience.steps': { title: '', text: '' },
  'homepage.sections.why.items': { title: '', text: '' },
  'homepage.featuredServices': '',
  'homepage.featuredProducts': '',
};

export const CONFIG_GROUPS = ['general', 'contact', 'commerce', 'navigation', 'homepage', 'seo'];
