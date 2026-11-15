import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Service from '../models/Service.js';
import { SERVICE_SEEDS } from '../../public-content.mjs';
import { slugify } from '../utils/helpers.js';

const apply = process.argv.includes('--apply');
const confirmProduction = process.argv.includes('--confirm-production');
const databaseArg = process.argv.find((arg) => arg.startsWith('--confirm-database='));
const confirmedDatabase = databaseArg?.slice('--confirm-database='.length);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function findExistingService(title, slug) {
  return Service.findOne({
    $or: [
      { slug },
      { title: new RegExp(`^${escapeRegex(title)}$`, 'i') },
    ],
  });
}

async function main() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000, autoIndex: false });
  const database = Service.db.name;
  console.log(`[db] connected to ${mongoose.connection.host}/${database}`);
  const missing = [];

  for (const [order, service] of SERVICE_SEEDS.entries()) {
    const slug = slugify(service.title);
    const existing = await findExistingService(service.title, slug);
    if (existing) {
      console.log(`PRESERVE ${service.title}`);
      continue;
    }

    missing.push({ ...service, slug, order, published: true });
    console.log(`MISSING  ${service.title}`);
  }

  console.log(`Database: ${database}`);
  console.log(`Missing services: ${missing.length} of ${SERVICE_SEEDS.length}`);

  if (!apply) {
    console.log('Dry run only. No documents were written. Use --apply and confirm the exact database to insert missing services.');
    return;
  }

  if (confirmedDatabase !== database) {
    throw new Error(`Write blocked: pass --confirm-database=${database} to confirm this target.`);
  }

  if (env.isProd && !confirmProduction) {
    throw new Error('Production write blocked: pass --confirm-production after obtaining explicit approval.');
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const expected = `RESTORE SERVICES INTO ${database}`;
    const answer = await rl.question(`Type "${expected}" to continue: `);
    if (answer !== expected) {
      console.log('Confirmation did not match. No documents were written.');
      return;
    }
  } finally {
    rl.close();
  }

  let inserted = 0;
  for (const service of missing) {
    try {
      await Service.create(service);
      inserted += 1;
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const existing = await findExistingService(service.title, service.slug);
      if (!existing) throw error;
      console.log(`PRESERVE ${service.title} (created concurrently)`);
    }
  }

  console.log(`Inserted ${inserted} missing service(s); existing documents were not modified.`);
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}
