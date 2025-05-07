// tests/transactions.spec.ts
import { describe, beforeAll, afterAll, beforeEach, test, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { setupApp } from '../src/app.js';
import { TransactionModel } from '../src/models/transaction.js';
import { GoodModel } from '../src/models/good.js';
import { HunterModel } from '../src/models/hunter.js';
import { MerchantModel } from '../src/models/merchant.js';

let app: ReturnType<typeof setupApp>;

beforeAll(async () => {
  app = await setupApp();
});

beforeEach(async () => {
  // Limpiar todas las colecciones relacionadas
  await TransactionModel.deleteMany({});
  await GoodModel.deleteMany({});
  await HunterModel.deleteMany({});
  await MerchantModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('CRUD completo de transactions', () => {
  // Datos de prueba comunes
  const createTestData = async () => {
    const hunter = await HunterModel.create({
      name: 'Geralt',
      type: 'brujo',
      experience: 95,
      coins: 500,
      isActive: true,
      monsterSpecialty: ['vampiros'],
      email: 'geralt@rivia.com'
    });

    const merchant = await MerchantModel.create({
      name: 'Zoltan',
      location: 'Novigrado',
      specialty: 'armero',
      inventorySize: 50,
      reputation: 8,
      isTraveling: false,
      contact: 'zoltan@dwarves.com'
    });

    const goods = await GoodModel.create([
      {
        id: 1,
        name: 'Espada de plata',
        material: 'acero',
        weight: 2.5,
        value: 250,
        stock: 10
      },
      {
        id: 2,
        name: 'Poción de salud',
        material: 'vidrio',
        weight: 0.2,
        value: 50,
        stock: 20
      }
    ]);

    return { hunter, merchant, goods };
  };

  // POST /transactions
  test('POST /transactions → 201 crea transacción de compra válida', async () => {
    const { hunter, goods } = await createTestData();

    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'purchase',
        clientName: 'Geralt',
        items: [
          { goodName: 'Espada de plata', quantity: 1 },
          { goodName: 'Poción de salud', quantity: 3 }
        ]
      })
      .expect(201);

    expect(res.body.type).toBe('purchase');
    expect(res.body.items).toHaveLength(2);
    expect(res.body.totalAmount).toBe(250 + (50 * 3));
  });

  test('POST /transactions → 400 si falta campo requerido', async () => {
    await createTestData();

    const res = await request(app)
      .post('/transactions')
      .send({
        clientName: 'Geralt',
        items: [{ goodName: 'Espada de plata', quantity: 1 }]
      })
      .expect(400);

    expect(res.body.error).toMatch(/Tipo de transacción no válido/);
  });

  test('POST /transactions → 404 si cliente no existe', async () => {
    await createTestData();

    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'purchase',
        clientName: 'NoExisto',
        items: [{ goodName: 'Espada de plata', quantity: 1 }]
      })
      .expect(404);

    expect(res.body.error).toMatch(/Cliente no encontrado/);
  });

  // GET /transactions/client
  test('GET /transactions/client → 200 obtiene transacciones por cliente', async () => {
    const { hunter } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250
    });

    const res = await request(app)
      .get('/transactions/client')
      .query({ clientName: 'Geralt' })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('purchase');
  });

  test('GET /transactions/client → 400 si falta clientName', async () => {
    await request(app)
      .get('/transactions/client')
      .expect(400);
  });

  // GET /transactions/date-range
  test('GET /transactions/date-range → 200 obtiene por rango de fechas', async () => {
    const { hunter } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250,
      date: new Date('2023-01-15')
    });

    const res = await request(app)
      .get('/transactions/date-range')
      .query({ 
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(new Date(res.body[0].date).getTime()).toBe(new Date('2023-01-15').getTime());
  });

  // GET /transactions/:id
  test('GET /transactions/:id → 200 obtiene transacción por ID', async () => {
    const { hunter } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250
    });

    const res = await request(app)
      .get(`/transactions/${transaction._id}`)
      .expect(200);

    expect(res.body._id).toBe(transaction._id.toString());
  });

  test('GET /transactions/:id → 404 si no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app)
      .get(`/transactions/${fakeId}`)
      .expect(404);
  });

  // DELETE /transactions/:id
  test('DELETE /transactions/:id → 200 elimina transacción', async () => {
    const { hunter } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250
    });

    await request(app)
      .delete(`/transactions/${transaction._id}`)
      .expect(200);

    const deleted = await TransactionModel.findById(transaction._id);
    expect(deleted).toBeNull();
  });

  test('DELETE /transactions/:id → 404 si no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app)
      .delete(`/transactions/${fakeId}`)
      .expect(404);
  });

  // PUT /transactions/:id
  test('PUT /transactions/:id → 200 actualiza transacción', async () => {
    const { hunter, merchant } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
      totalAmount: 250
    });

    const res = await request(app)
      .put(`/transactions/${transaction._id}`)
      .send({
        type: 'sale',
        clientName: 'Zoltan',
        items: [{ goodName: 'Espada de plata', quantity: 2 }]
      })
      .expect(200);

    expect(res.body.type).toBe('sale');
    expect(res.body.totalAmount).toBe(500);
  });

  test('PUT /transactions/:id → 404 si no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app)
      .put(`/transactions/${fakeId}`)
      .send({
        type: 'purchase',
        clientName: 'Geralt',
        items: [{ goodName: 'Espada de plata', quantity: 1 }]
      })
      .expect(404);
  });
});