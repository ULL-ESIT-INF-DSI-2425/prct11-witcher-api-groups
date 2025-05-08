import express, { Request, Response } from "express";
import { GoodModel } from "../models/good.js";
import { HunterModel } from "../models/hunter.js";
import { MerchantModel } from "../models/merchant.js";
import { Types } from "mongoose";
import {
  TransactionModel,
  TransactionType,
  TransactionItem,
} from "../models/transaction.js";

/**
 * Estructura para la creación de nuevas transacciones
 */
interface CreateTransactionRequest {
  /** Tipo de transacción (compra/venta) */
  type: TransactionType;
  /** Nombre del cliente asociado */
  clientName: string;
  /** Lista de items en la transacción */
  items: Array<{
    /** Nombre del bien transaccionado */
    goodName: string;
    /** Cantidad del bien */
    quantity: number;
  }>;
}

/**
 * Estructura para consulta por rango de fechas
 */
interface DateRangeRequest {
  /** Fecha de inicio (opcional) */
  startDate?: string;
  /** Fecha de fin (opcional) */
  endDate?: string;
  /** Tipo de transacción a filtrar (opcional) */
  type?: TransactionType;
}

export const transactionsRouter = express.Router();

/**
 * Helper para manejo centralizado de errores
 * @param res - Objeto Response de Express
 * @param error - Error capturado
 */
const handleError = (res: Response, error: unknown) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "Error desconocido";
  res.status(500).json({ error: message });
};

/**
 * Crea una nueva transacción.
 *
 * @remarks
 * Ruta: `POST /transactions`
 * - Respuesta 201: Transacción creada exitosamente.
 * - Respuesta 400: Error en los datos de entrada.
 * - Respuesta 404: Cliente o bien no encontrado.
 * - Respuesta 500: Error del servidor.
 *
 * El cuerpo de la petición (`req.body`) debe ajustarse a la interfaz `CreateTransactionRequest`.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns TransactionDocument  Transacción recién creada.
 * @throws Error  Si ocurre un error inesperado en el servidor.
 *
 * @example
 * ```json
 * {
 *   "type": "purchase",
 *   "clientName": "Geralt",
 *   "items": [
 *     { "goodName": "Espada de plata", "quantity": 1 },
 *     { "goodName": "Poción de salud", "quantity": 3 }
 *   ]
 * }
 * ```
 */
transactionsRouter.post(
  "/",
  async (
    req: Request<Record<string, unknown>, object, CreateTransactionRequest>,
    res: Response,
  ) => {
    try {
      const { type, clientName, items } = req.body;

      if (!type || !["purchase", "sale"].includes(type)) {
        res.status(400).json({ error: "Tipo de transacción no válido" });
        return;
      }

      let client;
      if (type === "purchase") {
        client = await HunterModel.findOne({ name: clientName });
      } else {
        client = await MerchantModel.findOne({ name: clientName });
      }
      if (!client) {
        res.status(404).json({ error: "Cliente no encontrado" });
        return;
      }

      const processedItems: TransactionItem[] = [];
      let totalAmount = 0;

      for (const item of items) {
        const good = await GoodModel.findOne({ name: item.goodName });
        if (!good) {
          res
            .status(404)
            .json({ error: `Bien no encontrado: ${item.goodName}` });
          return;
        }

        if (type === "purchase" && good.stock < item.quantity) {
          res
            .status(400)
            .json({ error: `Stock insuficiente para: ${item.goodName}` });
          return;
        }

        const itemTotal = good.value * item.quantity;
        totalAmount += itemTotal;

        processedItems.push({
          good: good._id as Types.ObjectId,
          quantity: item.quantity,
          priceAtTransaction: good.value,
        });
      }

      const transaction = new TransactionModel({
        type,
        client: client._id,
        clientModel: type === "purchase" ? "Hunter" : "Merchant",
        items: processedItems,
        totalAmount,
      });

      const savedTransaction = await transaction.save();
      res.status(201).json(savedTransaction);
    } catch (error) {
      handleError(res, error);
    }
  },
);

/**
 * Obtiene transacciones por nombre de cliente.
 *
 * @remarks
 * Ruta: `GET /transactions/client`
 * - Respuesta 200: Lista de `TransactionDocument[]`.
 * - Respuesta 400: Falta el parámetro `clientName`.
 * - Respuesta 404: Cliente no encontrado.
 * - Respuesta 500: Error del servidor.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns TransactionDocument[]  Transacciones encontradas.
 *
 * @example
 * ```http
 * GET /transactions/client?clientName=Zoltan
 * ```
 */
transactionsRouter.get(
  "/client",
  async (
    req: Request<
      Record<string, unknown>,
      object,
      object,
      { clientName: string }
    >,
    res: Response,
  ) => {
    try {
      const { clientName } = req.query;

      if (!clientName || typeof clientName !== "string") {
        res.status(400).json({ error: "Se requiere el nombre del cliente" });
        return;
      }

      const hunter = await HunterModel.findOne({ name: clientName });
      const merchant = await MerchantModel.findOne({ name: clientName });
      const client = hunter || merchant;

      if (!client) {
        res.status(404).json({ error: "Cliente no encontrado" });
        return;
      }

      const transactions = await TransactionModel.find({ client: client._id })
        .populate("client")
        .populate("items.good");

      res.json(transactions);
    } catch (error) {
      handleError(res, error);
    }
  },
);

/**
 * Obtiene transacciones en un rango de fechas.
 *
 * @remarks
 * Ruta: `GET /transactions/date-range`
 * - Respuesta 200: Lista de `TransactionDocument[]`.
 * - Respuesta 400: Fechas inválidas o faltantes.
 * - Respuesta 500: Error del servidor.
 *
 * Query string opcional:
 * - `startDate` (ISO)
 * - `endDate` (ISO)
 * - `type` (`purchase`|`sale`)
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns TransactionDocument[]  Transacciones dentro del rango.
 *
 * @example
 * ```http
 * GET /transactions/date-range?startDate=2025-01-01&endDate=2025-12-31&type=sale
 * ```
 */
transactionsRouter.get(
  "/date-range",
  async (
    req: Request<Record<string, unknown>, object, object, DateRangeRequest>,
    res: Response,
  ) => {
    try {
      const { startDate, endDate, type } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
        return;
      }

      const filter: {
        date?: { $gte: Date; $lte: Date };
        type?: TransactionType;
      } = {};

      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };

      if (type && ["purchase", "sale"].includes(type)) {
        filter.type = type as TransactionType;
      }

      const transactions = await TransactionModel.find(filter)
        .populate("client")
        .populate("items.good");

      res.json(transactions);
    } catch (error) {
      handleError(res, error);
    }
  },
);

/**
 * Obtiene una transacción por su ID.
 *
 * @remarks
 * Ruta: `GET /transactions/:id`
 * - Respuesta 200: Devuelve un `TransactionDocument`.
 * - Respuesta 404: Transacción no encontrada.
 * - Respuesta 500: Error del servidor.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns TransactionDocument  Transacción encontrada.
 *
 * @example
 * ```http
 * GET /transactions/507f1f77bcf86cd799439011
 * ```
 */
transactionsRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const transaction = await TransactionModel.findById(req.params.id)
        .populate("client")
        .populate("items.good");

      if (!transaction) {
        res.status(404).json({ error: "Transacción no encontrada" });
        return;
      }

      res.json(transaction);
    } catch (error) {
      handleError(res, error);
    }
  },
);

/**
 * Elimina una transacción por su ID y revierte el stock.
 *
 * @remarks
 * Ruta: `DELETE /transactions/:id`
 * - Respuesta 200: `{ message: 'Transacción eliminada correctamente' }`.
 * - Respuesta 404: Transacción no encontrada.
 * - Respuesta 500: Error del servidor.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns message: string -  Confirmación de eliminación.
 *
 * @example
 * ```http
 * DELETE /transactions/507f1f77bcf86cd799439011
 * ```
 */
transactionsRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const transaction = await TransactionModel.findById(req.params.id);
      if (!transaction) {
        res.status(404).json({ error: "Transacción no encontrada" });
        return;
      }

      for (const item of transaction.items) {
        const good = await GoodModel.findById(item.good);
        if (good) {
          good.stock +=
            transaction.type === "purchase" ? item.quantity : -item.quantity;
          await good.save();
        }
      }

      await transaction.deleteOne();
      res.json({ message: "Transacción eliminada correctamente" });
    } catch (error) {
      handleError(res, error);
    }
  },
);

/**
 * Actualiza una transacción existente.
 *
 * @remarks
 * Ruta: `PUT /transactions/:id`
 * - Respuesta 200: Transacción actualizada exitosamente.
 * - Respuesta 400: Error en los datos de entrada.
 * - Respuesta 404: Transacción no encontrada.
 * - Respuesta 500: Error del servidor.
 *
 * El cuerpo de la petición (`req.body`) debe ajustarse a la interfaz `CreateTransactionRequest`.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @returns TransactionDocument  Transacción actualizada.
 *
 * @example
 * ```json
 * {
 *   "type": "sale",
 *   "clientName": "Yennefer",
 *   "items": [
 *     { "goodName": "Libro de hechizos", "quantity": 2 }
 *   ]
 * }
 * ```
 */
transactionsRouter.put(
  "/:id",
  async (
    req: Request<{ id: string }, object, CreateTransactionRequest>,
    res: Response,
  ) => {
    try {
      const { id } = req.params;
      const { type, clientName, items } = req.body;

      if (!type || !["purchase", "sale"].includes(type)) {
        res.status(400).json({ error: "Tipo de transacción no válido" });
        return;
      }

      const transaction = await TransactionModel.findById(id);
      if (!transaction) {
        res.status(404).json({ error: "Transacción no encontrada" });
        return;
      }

      const client =
        type === "purchase"
          ? await HunterModel.findOne({ name: clientName })
          : await MerchantModel.findOne({ name: clientName });

      if (!client) {
        res.status(404).json({ error: "Cliente no encontrado" });
        return;
      }

      const processedItems: TransactionItem[] = [];
      let totalAmount = 0;

      for (const item of transaction.items) {
        const good = await GoodModel.findById(item.good);
        if (good) {
          good.stock +=
            transaction.type === "purchase" ? item.quantity : -item.quantity;
          await good.save();
        }
      }

      for (const item of items) {
        const good = await GoodModel.findOne({ name: item.goodName });
        if (!good) {
          res
            .status(404)
            .json({ error: `Bien no encontrado: ${item.goodName}` });
          return;
        }

        if (type === "purchase" && good.stock < item.quantity) {
          res
            .status(400)
            .json({ error: `Stock insuficiente para: ${item.goodName}` });
          return;
        }

        const itemTotal = good.value * item.quantity;
        totalAmount += itemTotal;

        processedItems.push({
          good: good._id as Types.ObjectId,
          quantity: item.quantity,
          priceAtTransaction: good.value,
        });

        good.stock += type === "purchase" ? -item.quantity : item.quantity;
        await good.save();
      }

      transaction.type = type;
      transaction.client = client._id as Types.ObjectId;
      transaction.clientModel = type === "purchase" ? "Hunter" : "Merchant";
      transaction.items = processedItems;
      transaction.totalAmount = totalAmount;

      const updatedTransaction = await transaction.save();
      res.json(updatedTransaction);
    } catch (error) {
      handleError(res, error);
    }
  },
);
