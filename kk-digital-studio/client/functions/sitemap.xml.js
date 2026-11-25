import { handleSitemap } from '../sitemap-handler.js';

export async function onRequestGet({ request }) {
  return handleSitemap(request);
}
