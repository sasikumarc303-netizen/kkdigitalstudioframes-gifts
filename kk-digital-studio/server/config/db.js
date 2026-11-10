import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);
// JSON shape used by every API response: expose a string `id`, keep `_id` (needed for stable sub-document ids), drop __v.
mongoose.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    if (ret._id) ret.id = String(ret._id);
    return ret;
  },
});

export async function connectDB() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const { host, name } = mongoose.connection;
  console.log(`[db] connected to MongoDB ${host}/${name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
