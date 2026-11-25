import { handleProductRoute } from '../../product-route-handler.js';

export async function onRequestGet(context) {
  return handleProductRoute(context);
}
