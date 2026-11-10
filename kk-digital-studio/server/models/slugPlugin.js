import { slugify } from '../utils/helpers.js';

/** Adds a unique, URL-safe `slug` that is generated from `source` when not supplied. */
export default function slugPlugin(schema, { source = 'title' } = {}) {
  schema.add({ slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true } });
  schema.pre('validate', async function ensureSlug() {
    if (this.slug && !this.isModified('slug')) return;
    const base = slugify(this.slug || this[source]);
    let candidate = base;
    let i = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
      i += 1;
      candidate = `${base}-${i}`;
    }
    this.slug = candidate;
  });
}
