import express, { Request, Response } from 'express';
import { TransactionModel, TransactionDocument, TransactionType } from '../models/transaction.js';
import { GoodModel } from '../models/good.js';
import { HunterModel } from '../models/hunter.js';
import { MerchantModel } from '../models/merchant.js';

/**
 * Interfaces personalizadas para tipado de requests
 */
interface TypedRequest<T> extends Request {
  body: T;
}

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
 * @param res Objeto Response de Express
 * @param error Error capturado
 */
const handleError = (res: Response, error: unknown) => {
  console.error(error);
  const message = error instanceof Error ? error.message : 'Error desconocido';
  res.status(500).json({ error: message });
};

/**
 * Crea una nueva transacción
 * 
 * @route POST /transactions
 * @param {CreateTransactionRequest} req.body - Datos de la transacción
 * @returns {TransactionDocument} 201 - Transacción creada exitosamente
 * @returns {Object} 400 - Error en los datos de entrada
 * @returns {Object} 404 - Cliente o bien no encontrado
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * POST /transactions
 * {
 *   "type": "purchase",
 *   "clientName": "Geralt",
 *   "items": [
 *     { "goodName": "Espada de plata", "quantity": 1 },
 *     { "goodName": "Poción de salud", "quantity": 3 }
 *   ]
 * }
 */
transactionsRouter.post('/', async (req: Request<{}, {}, CreateTransactionRequest>, res: Response) => {
  try {
    const { type, clientName, items } = req.body;

    if (!type || !['purchase', 'sale'].includes(type)) {
      res.status(400).json({ error: 'Tipo de transacción no válido' });
      return;
    }

    // Buscar cliente según tipo de transacción
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

    // Procesar cada item de la transacción
    for (const item of items) {
      const good = await GoodModel.findOne({ name: item.goodName });
      if (!good) {
        res.status(404).json({ error: `Bien no encontrado: ${item.goodName}` });
        return;
      }

      // Validar stock para compras
      if (type === 'purchase' && good.stock < item.quantity) {
        res.status(400).json({ error: `Stock insuficiente para: ${item.goodName}` });
        return;
      }
  
      // Calcular montos y actualizar stock
      const itemTotal = good.value * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        good: good._id,
        quantity: item.quantity,
        priceAtTransaction: good.value,
      });

      // Actualizar stock según tipo de transacción
      good.stock += type === 'purchase' ? -item.quantity : item.quantity;
      await good.save();
    }

    // Crear y guardar la transacción
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
  
/**
 * Obtiene transacciones por nombre de cliente
 * 
 * @route GET /transactions/client
 * @param {string} req.query.clientName - Nombre del cliente a buscar
 * @returns {TransactionDocument[]} 200 - Lista de transacciones encontradas
 * @returns {Object} 400 - Falta parámetro clientName
 * @returns {Object} 404 - Cliente no encontrado
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /transactions/client?clientName=Zoltan
 */
transactionsRouter.get('/client', async (req: Request<{}, {}, {}, { clientName: string }>, res: Response) => {
  try {
    const { clientName } = req.query;
  
    if (!clientName || typeof clientName !== 'string') {
      res.status(400).json({ error: 'Se requiere el nombre del cliente' });
      return;
    }
  
    // Buscar cliente (puede ser cazador o mercader)
    const hunter = await HunterModel.findOne({ name: clientName });
    const merchant = await MerchantModel.findOne({ name: clientName });
    const client = hunter || merchant;
  
    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
  
    // Obtener transacciones con datos poblados
    const transactions = await TransactionModel.find({ client: client._id })
      .populate('client')
      .populate('items.good');
  
    res.json(transactions);
  } catch (error) {
    handleError(res, error);
  }
});
  
/**
 * Obtiene transacciones por rango de fechas
 * 
 * @route GET /transactions/date-range
 * @param {string} [req.query.startDate] - Fecha de inicio (formato ISO)
 * @param {string} [req.query.endDate] - Fecha de fin (formato ISO)
 * @param {TransactionType} [req.query.type] - Tipo de transacción a filtrar
 * @returns {TransactionDocument[]} 200 - Lista de transacciones en el rango
 * @returns {Object} 400 - Fechas inválidas
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /transactions/date-range?startDate=2023-01-01&endDate=2023-12-31&type=sale
 */
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
  
/**
 * Obtiene una transacción específica por su ID
 * 
 * @route GET /transactions/:id
 * @param {string} req.params.id - ID de la transacción
 * @returns {TransactionDocument} 200 - Transacción encontrada
 * @returns {Object} 404 - Transacción no encontrada
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * GET /transactions/507f1f77bcf86cd799439011
 */
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
  
/**
 * Elimina una transacción por su ID y revierte los cambios en el stock
 * 
 * @route DELETE /transactions/:id
 * @param {string} req.params.id - ID de la transacción a eliminar
 * @returns {Object} 200 - Transacción eliminada correctamente
 * @returns {Object} 404 - Transacción no encontrada
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * DELETE /transactions/507f1f77bcf86cd799439011
 */
transactionsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const transaction = await TransactionModel.findById(req.params.id);
    if (!transaction) {
      res.status(404).json({ error: 'Transacción no encontrada' });
      return;
    }
  
    // Revertir cambios en el stock de los bienes
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