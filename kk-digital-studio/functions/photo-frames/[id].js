import { handleProductRoute } from '../../client/product-route-handler.js';

export async function onRequestGet(context) {
  return handleProductRoute(context);
}
