import mongoose from 'mongoose';
import { config } from '../../config/env.js';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;

  private constructor() {
    this.setupListeners();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private setupListeners(): void {
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      console.log('📦 MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err: unknown) => {
      this.isConnected = false;
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      console.warn('⚠️ MongoDB connection disconnected');
    });
  }

  public async connect(uri: string = config.mongodbUri): Promise<void> {
    if (this.isConnected || mongoose.connection.readyState === 1) {
      return;
    }

    try {
      await mongoose.connect(uri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
      } as mongoose.ConnectOptions);
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected successfully');
    }
  }

  public getStatus(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export const databaseConnection = DatabaseConnection.getInstance();

