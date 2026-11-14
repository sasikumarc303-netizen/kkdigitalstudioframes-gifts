export const SERVICE_SEEDS = [
  {
    title: 'Wedding Photography',
    tagline: 'Every ritual, every glance',
    description: 'Complete coverage of your wedding day, from preparations to the final farewell, with a calm, unobtrusive approach.',
    features: ['Full-day coverage', 'Candid and traditional moments', 'Edited high-resolution gallery', 'Album design available'],
  },
  {
    title: 'Pre-Wedding Photography',
    tagline: 'Your story before the vows',
    description: 'A relaxed shoot for the two of you in beautiful locations, with guided posing and natural light.',
    features: ['Location and outfit planning', 'Guided poses', 'Edited gallery', 'Prints and frames on request'],
  },
  {
    title: 'Birthday Photography',
    tagline: 'Celebrations worth remembering',
    description: 'From first birthdays to milestone parties, we capture the joy, the cake and the candid laughter.',
    features: ['Candid event coverage', 'Group and family portraits', 'Quick delivery of highlights'],
  },
  {
    title: 'Family Photography',
    tagline: 'Together, as you are',
    description: 'Warm family portraits in studio or outdoors that you will treasure for generations.',
    features: ['Studio or outdoor sessions', 'Multi-generation groups', 'Print and frame options'],
  },
  {
    title: 'Individual Photoshoot',
    tagline: 'Your moment in the frame',
    description: 'A personal session for social profiles, portfolios or simply because you deserve great photographs.',
    features: ['Wardrobe and style guidance', 'Studio lighting', 'Retouched final images'],
  },
  {
    title: 'Portrait Photography',
    tagline: 'Character in every frame',
    description: 'Refined portraits with flattering light and a relaxed, conversational direction.',
    features: ['Studio portraits', 'Natural-light sessions', 'Professional retouching'],
  },
  {
    title: 'Passport Photography',
    tagline: 'Quick, compliant and clear',
    description: 'Passport, visa and ID photographs prepared to the required specifications.',
    features: ['Standard size options', 'Same-visit printing', 'Digital copy available'],
  },
  {
    title: 'Product Photography',
    tagline: 'Show your product at its best',
    description: 'Clean, consistent product images for catalogues, online shops and social media.',
    features: ['Plain and styled backgrounds', 'Multiple angles', 'Web-ready files'],
  },
  {
    title: 'Event Photography',
    tagline: 'Capture the whole occasion',
    description: 'Corporate gatherings, ceremonies and community events documented with care.',
    features: ['Candid coverage', 'Group photographs', 'Fast turnaround'],
  },
  {
    title: 'Professional Headshots',
    tagline: 'A confident first impression',
    description: 'Polished headshots for LinkedIn, company profiles and personal branding.',
    features: ['Studio lighting', 'Multiple looks', 'Subtle retouching'],
  },
  {
    title: 'Photo Printing',
    tagline: 'From screen to something you can hold',
    description: 'High-quality prints in a range of sizes from your digital files or our own sessions.',
    features: ['Multiple paper options', 'Standard and large sizes', 'Careful colour matching'],
  },
  {
    title: 'Photo Framing',
    tagline: 'Finished, displayed, loved',
    description: 'Choose from our frame finishes and sizes to give your favourite photographs a proper home.',
    features: ['Oak, Acrylic and Metal finishes', 'Popular sizes', 'Custom sizes on request'],
  },
  {
    title: 'School Photography',
    tagline: 'Memories from the classroom',
    description: 'Individual and class photographs for schools, handled smoothly with minimal disruption.',
    features: ['Class and individual portraits', 'Group photographs', 'Print packages'],
  },
  {
    title: 'Album Design',
    tagline: 'A story you can turn the pages of',
    description: 'Thoughtfully designed albums that sequence your best images into a lasting keepsake.',
    features: ['Custom layouts', 'Proof approval', 'Premium printing and binding'],
  },
];

export const PACKAGE_SEEDS = [
  {
    name: 'Essential',
    tagline: 'A focused session to get great images',
    features: ['One photographer', 'Single location', 'Edited digital gallery'],
    popular: false,
    price: 0,
  },
  {
    name: 'Signature',
    tagline: 'Our most popular, balanced package',
    features: ['Extended session', 'Two outfit or look changes', 'Edited gallery', 'Selected prints'],
    popular: true,
    price: 0,
  },
  {
    name: 'Premium',
    tagline: 'The complete storytelling experience',
    features: ['Full coverage', 'Multiple locations', 'Designed album', 'Framed enlargement'],
    popular: false,
    price: 0,
  },
];

export function slugifyPublicName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getFallbackServices() {
  return SERVICE_SEEDS.map((service) => ({
    ...service,
    id: null,
    slug: slugifyPublicName(service.title),
    image: '',
    startingPrice: '',
    isLocalFallback: true,
  }));
}

export function getFallbackPackages() {
  return PACKAGE_SEEDS.map((pkg) => ({
    ...pkg,
    id: `local-${slugifyPublicName(pkg.name)}`,
    image: '',
    isLocalFallback: true,
  }));
}
