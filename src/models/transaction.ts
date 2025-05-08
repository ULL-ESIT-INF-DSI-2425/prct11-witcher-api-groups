import { Document, model, Schema, Types } from "mongoose";
import { GoodDocument } from "./good.js";
import { HunterDocument } from "./hunter.js";
import { MerchantDocument } from "./merchant.js";
import { GoodModel } from "./good.js";

/**
 * Tipo que representa los posibles tipos de transacción en el sistema.
 * - 'purchase': Cuando el comerciante compra bienes
 * - 'sale': Cuando el comerciante vende bienes
 */
export type TransactionType = "purchase" | "sale";

/**
 * Interfaz que representa un ítem dentro de una transacción.
 * Contiene información sobre el bien transaccionado y los detalles de la operación.
 */
export interface TransactionItem {
  /** Referencia al bien involucrado en la transacción (puede ser ObjectId o documento poblado) */
  good: Types.ObjectId | GoodDocument;
  /** Cantidad del bien transaccionado (mínimo 1) */
  quantity: number;
  /** Precio unitario registrado al momento de la transacción (no puede ser negativo) */
  priceAtTransaction: number;
}

/**
 * Interfaz principal que representa un documento de Transacción en la base de datos.
 * Contiene toda la información relevante sobre una operación comercial.
 */
export interface TransactionDocument extends Document {
  /** Tipo de transacción (compra o venta) */
  type: TransactionType;
  /** Fecha en que se realizó la transacción (se establece automáticamente al crear) */
  date: Date;
  /** Cliente asociado a la transacción (puede ser Cazador o Comerciante) */
  client: Types.ObjectId | HunterDocument | MerchantDocument;
  /** Modelo del cliente (determina si es Hunter o Merchant para la referencia) */
  clientModel: "Hunter" | "Merchant";
  /** Lista de ítems incluidos en la transacción (debe contener al menos uno) */
  items: TransactionItem[];
  /** Monto total calculado de la transacción (no puede ser negativo) */
  totalAmount: number;
}

/**
 * Esquema para los ítems individuales dentro de una transacción.
 * Define la estructura y validaciones para cada línea de la transacción.
 */
const transactionItemSchema = new Schema<TransactionItem>({
  good: {
    type: Schema.Types.ObjectId,
    ref: "Good",
    required: [true, "El bien es obligatorio en cada ítem"],
  },
  quantity: {
    type: Number,
    required: [true, "La cantidad es obligatoria"],
    min: [1, "La cantidad mínima es 1"],
  },
  priceAtTransaction: {
    type: Number,
    required: [true, "El precio es obligatorio"],
    min: [0, "El precio no puede ser negativo"],
  },
});

/**
 * Esquema principal para las transacciones en la base de datos.
 * Define la estructura, validaciones y configuraciones para documentos de transacción.
 */
const transactionSchema = new Schema<TransactionDocument>(
  {
    type: {
      type: String,
      required: [true, "El tipo de transacción es obligatorio"],
      enum: {
        values: ["purchase", "sale"] as const,
        message: "{VALUE} no es un tipo de transacción válido",
      },
    },
    date: {
      type: Date,
      required: [true, "La fecha es obligatoria"],
      default: Date.now,
    },
    client: {
      type: Schema.Types.ObjectId,
      required: [true, "El cliente es obligatorio"],
      refPath: "clientModel",
    },
    clientModel: {
      type: String,
      required: [true, "El modelo de cliente es obligatorio"],
      enum: {
        values: ["Hunter", "Merchant"] as const,
        message: "{VALUE} no es un modelo de cliente válido",
      },
    },
    items: {
      type: [transactionItemSchema],
      required: [true, "Los items son obligatorios"],
      validate: {
        validator: (v: TransactionItem[]) => v.length > 0,
        message: "Debe haber al menos un item en la transacción",
      },
    },
    totalAmount: {
      type: Number,
      required: [true, "El monto total es obligatorio"],
      min: [0, "El monto total no puede ser negativo"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

transactionSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  for (const item of this.items) {
    const good = await GoodModel.findById(item.good);
    if (!good) continue;

    good.stock += this.type === "purchase" ? -item.quantity : item.quantity;
    await good.save();
  }
  next();
});

/**
 * Modelo de Mongoose para la colección de Transacciones.
 * Proporciona métodos para interactuar con la colección 'transactions' en MongoDB.
 */
export const TransactionModel = model<TransactionDocument>(
  "Transaction",
  transactionSchema,
);
