import express, { Request, Response } from 'express';
import { TransactionModel, TransactionDocument, TransactionType } from '../models/transaction.js';
import { GoodModel } from '../models/good.js';
import { HunterModel } from '../models/hunter.js';
import { MerchantModel } from '../models/merchant.js';

interface TypedRequest<T> extends Request {
  body: T;
}
  
interface CreateTransactionRequest {
  type: TransactionType;
  clientName: string;
  items: Array<{
    goodName: string;
    quantity: number;
  }>;
}
  
interface DateRangeRequest {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
}
  
export const transactionsRouter = express.Router();
  
// Helper para manejar errores
const handleError = (res: Response, error: unknown) => {
  console.error(error);
  const message = error instanceof Error ? error.message : 'Error desconocido';
  res.status(500).json({ error: message });
};
  
// Crear una nueva transacción
transactionsRouter.post('/', async (req: Request<{}, {}, CreateTransactionRequest>, res: Response) => {
  try {
    const { type, clientName, items } = req.body;

    if (!type || !['purchase', 'sale'].includes(type)) {
      res.status(400).json({ error: 'Tipo de transacción no válido' });
      return;
    }

    let client;
    if (type === 'purchase') {
      client = await HunterModel.findOne({ name: clientName });
    } else {
      client = await MerchantModel.findOne({ name: clientName });
    }
    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
  
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const good = await GoodModel.findOne({ name: item.goodName });
      if (!good) {
        res.status(404).json({ error: `Bien no encontrado: ${item.goodName}` });
        return;
      }

      if (type === 'purchase' && good.stock < item.quantity) {
        res.status(400).json({ error: `Stock insuficiente para: ${item.goodName}` });
        return;
      }
  
      const itemTotal = good.value * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        good: good._id,
        quantity: item.quantity,
        priceAtTransaction: good.value,
      });

      good.stock += type === 'purchase' ? -item.quantity : item.quantity;
      await good.save();
    }

    const transaction = new TransactionModel({
      type,
      client: client._id,
      clientModel: type === 'purchase' ? 'Hunter' : 'Merchant',
      items: processedItems,
      totalAmount,
    });
  
    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    handleError(res, error);
  }
});
  
  // Obtener transacciones por cliente
  transactionsRouter.get('/client', async (req: Request<{}, {}, {}, { clientName: string }>, res: Response) => {
    try {
      const { clientName } = req.query;
  
      if (!clientName || typeof clientName !== 'string') {
        res.status(400).json({ error: 'Se requiere el nombre del cliente' });
        return;
      }
  
      const hunter = await HunterModel.findOne({ name: clientName });
      const merchant = await MerchantModel.findOne({ name: clientName });
      const client = hunter || merchant;
  
      if (!client) {
        res.status(404).json({ error: 'Cliente no encontrado' });
        return;
      }
  
      const transactions = await TransactionModel.find({ client: client._id })
        .populate('client')
        .populate('items.good');
  
      res.json(transactions);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Obtener transacciones por rango de fechas
  transactionsRouter.get('/date-range', async (req: Request<{}, {}, {}, DateRangeRequest>, res: Response) => {
    try {
      const { startDate, endDate, type } = req.query;
  
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
        return;
      }
  
      const filter: any = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
  
      if (type && ['purchase', 'sale'].includes(type)) {
        filter.type = type;
      }
  
      const transactions = await TransactionModel.find(filter)
        .populate('client')
        .populate('items.good');
  
      res.json(transactions);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Obtener transacción por ID
  transactionsRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
      const transaction = await TransactionModel.findById(req.params.id)
        .populate('client')
        .populate('items.good');
  
      if (!transaction) {
        res.status(404).json({ error: 'Transacción no encontrada' });
        return;
      }
  
      res.json(transaction);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  // Eliminar transacción por ID
  transactionsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
      const transaction = await TransactionModel.findById(req.params.id);
      if (!transaction) {
        res.status(404).json({ error: 'Transacción no encontrada' });
        return;
      }
  
      for (const item of transaction.items) {
        const good = await GoodModel.findById(item.good);
        if (good) {
          good.stock += transaction.type === 'purchase' ? item.quantity : -item.quantity;
          await good.save();
        }
      }
  
      await transaction.deleteOne();
      res.json({ message: 'Transacción eliminada correctamente' });
    } catch (error) {
      handleError(res, error);
    }
  });