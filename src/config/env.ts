import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  mongodbUri: string;
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transaction_ledger',
};

