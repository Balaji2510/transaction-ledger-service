import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AccountDocument extends Document<string> {
  _id: string;
  name: string;
  balance: number;
  created_at: string;
}

const accountSchema = new Schema<AccountDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
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

// Explicit index on created_at for chronological ordering / audit queries
accountSchema.index({ created_at: -1 });

export const AccountModel: Model<AccountDocument> =
  mongoose.models.Account || mongoose.model<AccountDocument>('Account', accountSchema);

