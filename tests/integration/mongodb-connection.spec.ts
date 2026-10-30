import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { databaseConnection } from '../../src/infrastructure/database/mongoose.connection.js';
import { config } from '../../src/config/env.js';

describe('Local MongoDB Connection Verification', () => {
  it('should successfully connect to local MongoDB server', async () => {
    await databaseConnection.connect(config.mongodbUri);

    expect(databaseConnection.getStatus()).toBe(true);
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.host).toBe('127.0.0.1');
    expect(mongoose.connection.name).toBe('transaction_ledger');

    await databaseConnection.disconnect();
    expect(databaseConnection.getStatus()).toBe(false);
  });
});
