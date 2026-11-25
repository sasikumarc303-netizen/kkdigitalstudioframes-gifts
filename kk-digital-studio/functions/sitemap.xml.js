import { handleSitemap } from '../client/sitemap-handler.js';

export async function onRequestGet({ request }) {
  return handleSitemap(request);
}
