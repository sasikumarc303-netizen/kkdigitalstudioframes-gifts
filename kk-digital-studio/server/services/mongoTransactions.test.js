import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { withMongoTransaction } from './mongoTransactions.js';

test('runs the operation with a session and ends the session after commit', async () => {
  const session = {
    async withTransaction(operation) {
      return operation();
    },
    async endSession() {
      ended = true;
    },
  };
  const originalStartSession = mongoose.startSession;
  let ended = false;
  mongoose.startSession = async () => session;

  try {
    const result = await withMongoTransaction(async (receivedSession) => {
      assert.equal(receivedSession, session);
      return 'committed';
    });
    assert.equal(result, 'committed');
    assert.equal(ended, true);
  } finally {
    mongoose.startSession = originalStartSession;
  }
});

test('propagates transaction failures and still ends the session without a fallback', async () => {
  const transactionError = new Error('transaction failed');
  let ended = false;
  let operationCalls = 0;
  const session = {
    async withTransaction(operation) {
      return operation();
    },
    async endSession() {
      ended = true;
    },
  };
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => session;

  try {
    await assert.rejects(withMongoTransaction(async () => {
      operationCalls += 1;
      throw transactionError;
    }), (error) => error === transactionError);
  } finally {
    mongoose.startSession = originalStartSession;
  }

  assert.equal(operationCalls, 1);
  assert.equal(ended, true);
});
