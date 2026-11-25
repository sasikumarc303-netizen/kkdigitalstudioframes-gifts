// Default site content & settings. Stored values (edited in the admin panel) are merged over these.
// Nothing here is a made-up business fact: no phone numbers, prices, reviews or opening hours are invented.
import { SEO_PAGES } from '../../seo.mjs';

const DEFAULT_SEO_PAGES = Object.fromEntries(
  Object.entries(SEO_PAGES).map(([route, page]) => [route, { ...page, ogImage: '' }])
);

export const DEFAULT_CONFIG = {
  general: {
    businessName: 'KK Digital Studio Frames & Gifts',
    tagline: 'Professional Photography Studio',
    logo: '',
    favicon: '',
    footerText: 'Professional photography, photo printing and framing from Achamangalam, Tirupattur.',
    currency: 'INR',
    currencySymbol: '₹',
  },
  contact: {
    phone: '+91 97888 89966',
    whatsapp: '',
    email: 'kkdigital85@gmail.com',
    address: 'Achamangalam, Tirupattur, Tamil Nadu 635651, India',
    mapQuery: '',
    mapUrl: 'https://maps.app.goo.gl/yJQow79hUqVUjyZW7?g_st=aw',
    mapEmbedUrl: 'https://www.google.com/maps/embed?origin=mfe&pb=!6m8!1m7!1sHsYmabhV_o87eZEWGLsahw!2m2!1d12.5209761!2d78.5493927!3f45.05!4f-0!5f8',
    hours: [
      { days: 'Monday – Saturday', time: '9:00 AM – 8:00 PM' },
      { days: 'Sunday', time: '9:00 AM – 1:00 PM' },
    ],
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
      eyebrow: 'KK Digital Studio Frames & Gifts · Tirupattur',
      heading: 'Photo Studio in Tirupattur for Moments Worth Keeping',
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
        title: 'Photography, Prints & Frames in Tirupattur',
        text: 'KK Digital Studio Frames & Gifts is a photo studio in Achamangalam, Tirupattur. We photograph portraits, weddings and events, and offer prints, handcrafted frames and customized gifts.',
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
      contact: { visible: true, eyebrow: 'Visit & contact', title: 'Find Us in Achamangalam' },
    },
    featuredServices: [],
    featuredProducts: [],
  },
  seo: {
    defaultOgImage: '/images/hero-poster.jpg',
    robotsTxt: '',
    pages: {
      ...DEFAULT_SEO_PAGES,
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
