import { Document, model, Schema, Types } from 'mongoose';
import { GoodDocument } from './good.js';
import { HunterDocument } from './hunter.js';
import { MerchantDocument } from './merchant.js';

export type TransactionType = 'purchase' | 'sale';

export interface TransactionItem {
  good: Types.ObjectId | GoodDocument;
  quantity: number;
  priceAtTransaction: number;
}

export interface TransactionDocument extends Document {
  type: TransactionType;
  date: Date;
  client: Types.ObjectId | HunterDocument | MerchantDocument;
  clientModel: 'Hunter' | 'Merchant';
  items: TransactionItem[];
  totalAmount: number;
}

const transactionItemSchema = new Schema<TransactionItem>({
  good: { 
    type: Schema.Types.ObjectId, 
    ref: 'Good', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  priceAtTransaction: { 
    type: Number, 
    required: true, 
    min: 0 
  }
});

const transactionSchema = new Schema<TransactionDocument>({
  type: {
    type: String,
    required: true,
    enum: ['purchase', 'sale'] as const
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  client: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'clientModel'
  },
  clientModel: {
    type: String,
    required: true,
    enum: ['Hunter', 'Merchant'] as const
  },
  items: {
    type: [transactionItemSchema],
    required: true,
    validate: {
      validator: (v: TransactionItem[]) => v.length > 0,
      message: 'Debe haber al menos un item en la transacción'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

export const TransactionModel = model<TransactionDocument>('Transaction', transactionSchema);