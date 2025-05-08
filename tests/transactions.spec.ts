import { describe, beforeAll, afterAll, beforeEach, test, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { setupApp } from '../src/app.js';
import { TransactionModel } from '../src/models/transaction.js';
import { GoodModel } from '../src/models/good.js';
import { HunterModel } from '../src/models/hunter.js';
import { MerchantModel } from '../src/models/merchant.js';

let app;

beforeAll(async () => {
  app = await setupApp();
});

beforeEach(async () => {
  await Promise.all([
    TransactionModel.deleteMany({}),
    GoodModel.deleteMany({}),
    HunterModel.deleteMany({}),
    MerchantModel.deleteMany({}),
  ]);
});

async function seedData() {
  const hunter = await HunterModel.create({
    name: 'Geralt',
    type: 'brujo',
    experience: 95,
    coins: 500,
    isActive: true,
    monsterSpecialty: ['vampiros'],
    email: 'geralt@rivia.com',
  });

  const merchant = await MerchantModel.create({
    name: 'Zoltan',
    location: 'Novigrado',
    specialty: 'armero',
    inventorySize: 50,
    reputation: 8,
    isTraveling: false,
    contact: 'zoltan@dwarves.com',
  });

  const goods = await GoodModel.create([
    { id: 1, name: 'Espada de plata', material: 'acero', weight: 2.5, value: 250, stock: 10 },
    { id: 2, name: 'Poción de salud', material: 'vidrio', weight: 0.2, value: 50, stock: 20 },
  ]);

  return { hunter, merchant, goods };
}

describe('/transactions CRUD y validaciones', () => {
  test('POST compra exitosa descuenta stock y retorna 201', async () => {
    const { hunter } = await seedData();
    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'purchase',
        clientName: hunter.name,
        items: [
          { goodName: 'Espada de plata', quantity: 2 },
          { goodName: 'Poción de salud', quantity: 1 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'purchase', totalAmount: 250 * 2 + 50 });

    const sword = await GoodModel.findOne({ name: 'Espada de plata' });
    const potion = await GoodModel.findOne({ name: 'Poción de salud' });
    expect(sword.stock).toBe(8);
    expect(potion.stock).toBe(19);
  });

  test('POST venta exitosa incrementa stock y retorna 201', async () => {
    const { merchant } = await seedData();
    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'sale',
        clientName: merchant.name,
        items: [{ goodName: 'Espada de plata', quantity: 5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(250 * 5);

    const sword = await GoodModel.findOne({ name: 'Espada de plata' });
    expect(sword.stock).toBe(15);
  });

  test('POST sin tipo da 400', async () => {
    await seedData();
    const res = await request(app)
      .post('/transactions')
      .send({ clientName: 'Geralt', items: [{ goodName: 'Espada de plata', quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  test('GET /client filtra por nombre de cliente', async () => {
    const { hunter, merchant } = await seedData();
    await TransactionModel.create({ type: 'purchase', client: hunter._id, clientModel: 'Hunter', items: [{ good: (await GoodModel.findOne({ name: 'Espada de plata' }))._id, quantity: 1, priceAtTransaction: 250 }], totalAmount: 250 });
    await TransactionModel.create({ type: 'sale', client: merchant._id, clientModel: 'Merchant', items: [{ good: (await GoodModel.findOne({ name: 'Poción de salud' }))._id, quantity: 2, priceAtTransaction: 50 }], totalAmount: 100 });

    const res = await request(app)
      .get('/transactions/client')
      .query({ clientName: hunter.name });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('purchase');
  });

  test('GET /date-range devuelve transacciones dentro de rango y opcional tipo', async () => {
    const { hunter, merchant } = await seedData();
    const swordId = (await GoodModel.findOne({ name: 'Espada de plata' }))._id;

    const t1 = { type: 'purchase', client: hunter._id, clientModel: 'Hunter', items: [{ good: swordId, quantity: 1, priceAtTransaction: 250 }], totalAmount: 250, date: new Date('2025-01-01') };
    const t2 = { type: 'sale', client: merchant._id, clientModel: 'Merchant', items: [{ good: swordId, quantity: 1, priceAtTransaction: 250 }], totalAmount: 250, date: new Date('2025-02-01') };
    await TransactionModel.create([t1, t2]);

    let res = await request(app).get('/transactions/date-range').query({ startDate: '2025-01-01', endDate: '2025-01-31' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    res = await request(app).get('/transactions/date-range').query({ startDate: '2025-01-01', endDate: '2025-12-31', type: 'sale' });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('sale');
  });

  test('GET /:id retorna transacción o 404 si no existe', async () => {
    const { hunter } = await seedData();
    const tx = await TransactionModel.create({ type: 'purchase', client: hunter._id, clientModel: 'Hunter', items: [{ good: (await GoodModel.findOne({ name: 'Espada de plata' }))._id, quantity: 1, priceAtTransaction: 250 }], totalAmount: 250 });

    let res = await request(app).get(`/transactions/${tx._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(tx._id.toString());

    const fake = new mongoose.Types.ObjectId();
    res = await request(app).get(`/transactions/${fake}`);
    expect(res.status).toBe(404);
  });

  test('PUT actualiza transacción, ajusta stock y retorna 200', async () => {
    const { hunter, merchant } = await seedData();
    const sword = await GoodModel.findOne({ name: 'Espada de plata' });
    const potion = await GoodModel.findOne({ name: 'Poción de salud' });

    const tx = await TransactionModel.create({ type: 'purchase', client: hunter._id, clientModel: 'Hunter', items: [{ good: sword._id, quantity: 2, priceAtTransaction: sword.value }], totalAmount: sword.value * 2 });

    const res = await request(app)
      .put(`/transactions/${tx._id}`)
      .send({ type: 'sale', clientName: merchant.name, items: [{ goodName: 'Poción de salud', quantity: 4 }] });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('sale');

    const s2 = await GoodModel.findById(sword._id);
    const p2 = await GoodModel.findById(potion._id);
    expect(s2.stock).toBe(10);
    expect(p2.stock).toBe(24);
  });

  test('DELETE elimina transacción y revierte stock', async () => {
    const { hunter } = await seedData();
    const sword = await GoodModel.findOne({ name: 'Espada de plata' });

    const tx = await TransactionModel.create({ type: 'purchase', client: hunter._id, clientModel: 'Hunter', items: [{ good: sword._id, quantity: 3, priceAtTransaction: sword.value }], totalAmount: sword.value * 3 });
    let updated = await GoodModel.findById(sword._id);
    expect(updated.stock).toBe(7);

    const res = await request(app).delete(`/transactions/${tx._id}`);
    expect(res.status).toBe(200);

    updated = await GoodModel.findById(sword._id);
    expect(updated.stock).toBe(10);

    const found = await TransactionModel.findById(tx._id);
    expect(found).toBeNull();
  });
});
