import cors from 'cors';
import { env } from '../config/env.js';

export const allowedClientOrigins = [...new Set([
  ...env.clientOrigins,
  'https://kk-digital-studio.pages.dev',
  'https://kkdigitalstudioframes.com',
  'https://www.kkdigitalstudioframes.com',
])];

export const corsMiddleware = cors({
  origin: allowedClientOrigins,
  credentials: true,
});
