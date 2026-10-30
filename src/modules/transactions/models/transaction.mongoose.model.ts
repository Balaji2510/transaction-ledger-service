import mongoose, { Schema, Document, Model } from 'mongoose';
import { TransactionType } from './transaction.entity.js';

export interface TransactionDocument extends Document<string> {
  _id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  referenceId: string;
  description?: string;
  created_at: string;
}

const transactionSchema = new Schema<TransactionDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    accountId: {
      type: String,
      required: [true, 'accountId is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },
    referenceId: {
      type: String,
      required: [true, 'referenceId is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    created_at: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        const { _id, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// High performance compound indexes for scalable history querying and type filtering
transactionSchema.index({ accountId: 1, created_at: -1 });
transactionSchema.index({ accountId: 1, type: 1, created_at: -1 });
// Unique compound index to prevent duplicate referenceId for the same account
transactionSchema.index({ accountId: 1, referenceId: 1 }, { unique: true });

export const TransactionModel: Model<TransactionDocument> =
  mongoose.models.Transaction || mongoose.model<TransactionDocument>('Transaction', transactionSchema);
