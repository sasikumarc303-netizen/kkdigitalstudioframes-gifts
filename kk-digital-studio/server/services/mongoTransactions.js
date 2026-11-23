import mongoose from 'mongoose';

export async function withMongoTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => operation(session));
  } finally {
    await session.endSession();
  }
}
