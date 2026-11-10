import Customer from '../models/Customer.js';
import { phoneKey } from '../utils/helpers.js';

/** Find (by phone, else email) or create a customer record and fill in any missing details. */
export async function upsertCustomer({ name, phone, email, address, source = 'website' }) {
  const key = phoneKey(phone);
  let customer = null;
  if (key) customer = await Customer.findOne({ phoneKey: key });
  if (!customer && email) customer = await Customer.findOne({ email: String(email).toLowerCase() });
  if (!customer) {
    return Customer.create({ name, phone: phone || '', phoneKey: key, email: email || '', address: address || '', source });
  }
  const patch = {};
  if (!customer.email && email) patch.email = email;
  if (!customer.phone && phone) {
    patch.phone = phone;
    patch.phoneKey = key;
  }
  if (address && !customer.address) patch.address = address;
  if (Object.keys(patch).length) {
    Object.assign(customer, patch);
    await customer.save();
  }
  return customer;
}
