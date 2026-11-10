import Product from '../models/Product.js';
import { getConfig } from './siteConfig.js';

/**
 * Prices a cart from the database (never trusts prices sent by the browser).
 * items: [{ productId, variantId, quantity }]  →  { lines, issues, subtotal }
 */
export async function priceCart(items) {
  const ids = [...new Set(items.map((i) => String(i.productId)))];
  const products = await Product.find({ _id: { $in: ids }, published: true });
  const map = new Map(products.map((p) => [String(p._id), p]));
  const lines = [];
  const issues = [];
  let subtotal = 0;

  items.forEach((item, index) => {
    const product = map.get(String(item.productId));
    if (!product) {
      issues.push({ index, productId: item.productId, variantId: item.variantId, code: 'unavailable', message: 'This product is no longer available.' });
      return;
    }
    const variant = product.variants.id(item.variantId);
    if (!variant || !variant.active) {
      issues.push({ index, productId: item.productId, variantId: item.variantId, code: 'unavailable', message: `${product.name}: this option is no longer available.` });
      return;
    }
    if (!(variant.price > 0)) {
      issues.push({ index, productId: item.productId, variantId: item.variantId, code: 'no-price', message: `${product.name}: price is on request. Please send an enquiry instead.` });
      return;
    }
    const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
    let note = '';
    if (variant.stock < quantity) {
      issues.push({
        index, productId: item.productId, variantId: item.variantId, code: variant.stock <= 0 ? 'out-of-stock' : 'low-stock',
        message: variant.stock <= 0 ? `${product.name} (${[variant.size, variant.finish].filter(Boolean).join(' · ')}) is out of stock.` : `Only ${variant.stock} of ${product.name} (${[variant.size, variant.finish].filter(Boolean).join(' · ')}) left in stock.`,
        available: variant.stock,
      });
      note = 'stock';
    }
    const lineTotal = variant.price * quantity;
    subtotal += lineTotal;
    lines.push({
      product: product._id,
      productSlug: product.slug,
      variantId: String(variant._id),
      name: product.name,
      size: variant.size,
      finish: variant.finish,
      sku: variant.sku,
      image: product.images?.[0] || '',
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity,
      lineTotal,
      stock: variant.stock,
      stockIssue: note === 'stock',
    });
  });
  return { lines, issues, subtotal };
}

export async function shippingFor(subtotal, fulfilment) {
  const { commerce } = await getConfig();
  if (fulfilment === 'pickup' && commerce.allowPickup) return 0;
  if (commerce.freeShippingAbove > 0 && subtotal >= commerce.freeShippingAbove) return 0;
  return commerce.flatShipping || 0;
}

/** Atomically takes stock for every line. On any failure everything already taken is put back. */
export async function reserveStock(lines) {
  const taken = [];
  for (const l of lines) {
    // eslint-disable-next-line no-await-in-loop
    const res = await Product.updateOne(
      { _id: l.product, variants: { $elemMatch: { _id: l.variantId, stock: { $gte: l.quantity }, active: true } } },
      { $inc: { 'variants.$.stock': -l.quantity } }
    );
    if (res.modifiedCount !== 1) {
      await Promise.all(taken.map((t) => Product.updateOne({ _id: t.product, 'variants._id': t.variantId }, { $inc: { 'variants.$.stock': t.quantity } })));
      return false;
    }
    taken.push(l);
  }
  return true;
}

/** Put stock back for a cancelled order (once). */
export async function restoreStock(order) {
  if (order.stockRestored) return;
  await Promise.all(
    order.items.map((i) => Product.updateOne({ _id: i.product, 'variants._id': i.variantId }, { $inc: { 'variants.$.stock': i.quantity } }))
  );
  order.stockRestored = true;
}
