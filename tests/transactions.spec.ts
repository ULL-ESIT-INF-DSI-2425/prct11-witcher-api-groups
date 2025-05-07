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

describe('CRUD completo de /transactions', () => {
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

    const transaction = {
      type: 'purchase',
      clientName: 'Geralt',
      items: [
        { goodName: 'Espada de plata', quantity: 1 },
        { goodName: 'Poción de salud', quantity: 3 }
      ]
    };

    const res = await request(app)
      .post('/transactions')
      .send(transaction)
      .expect(201);

    expect(res.body.type).toBe('purchase');
    expect(res.body.client).toBe(hunter._id.toString());
    expect(res.body.items).toHaveLength(2);
    expect(res.body.totalAmount).toBe(250 + (50 * 3)); // 250 + 150 = 400

    // Verificar que se actualizó el stock
    const updatedGood1 = await GoodModel.findOne({ name: 'Espada de plata' });
    const updatedGood2 = await GoodModel.findOne({ name: 'Poción de salud' });
    expect(updatedGood1?.stock).toBe(9); // 10 - 1
    expect(updatedGood2?.stock).toBe(17); // 20 - 3
  });

  test('POST /transactions → 201 crea transacción de venta válida', async () => {
    const { merchant, goods } = await createTestData();

    const transaction = {
      type: 'sale',
      clientName: 'Zoltan',
      items: [
        { goodName: 'Espada de plata', quantity: 2 }
      ]
    };

    const res = await request(app)
      .post('/transactions')
      .send(transaction)
      .expect(201);

    expect(res.body.type).toBe('sale');
    expect(res.body.client).toBe(merchant._id.toString());
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totalAmount).toBe(250 * 2); // 500

    // Verificar que se actualizó el stock
    const updatedGood = await GoodModel.findOne({ name: 'Espada de plata' });
    expect(updatedGood?.stock).toBe(12); // 10 + 2
  });

  test('POST /transactions → 400 si falta campo requerido', async () => {
    const res = await request(app)
      .post('/transactions')
      .send({
        clientName: 'Geralt',
        items: [{ goodName: 'Espada', quantity: 1 }]
      })
      .expect(400);

    expect(res.body.error).toMatch(/Tipo de transacción no válido/);
  });

  test('POST /transactions → 400 si tipo de transacción inválido', async () => {
    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'invalid',
        clientName: 'Geralt',
        items: [{ goodName: 'Espada', quantity: 1 }]
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

  test('POST /transactions → 404 si bien no existe', async () => {
    const { hunter } = await createTestData();

    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'purchase',
        clientName: 'Geralt',
        items: [{ goodName: 'Arma inexistente', quantity: 1 }]
      })
      .expect(404);

    expect(res.body.error).toMatch(/Bien no encontrado/);
  });

  test('POST /transactions → 400 si stock insuficiente para compra', async () => {
    const { hunter } = await createTestData();

    const res = await request(app)
      .post('/transactions')
      .send({
        type: 'purchase',
        clientName: 'Geralt',
        items: [{ goodName: 'Espada de plata', quantity: 100 }]
      })
      .expect(400);

    expect(res.body.error).toMatch(/Stock insuficiente para/);
  });

  // GET /transactions/client
  test('GET /transactions/client → 200 obtiene transacciones por cliente', async () => {
    const { hunter, merchant } = await createTestData();

    // Crear transacciones de prueba
    await TransactionModel.create([
      {
        type: 'purchase',
        client: hunter._id,
        clientModel: 'Hunter',
        items: [{ good: (await GoodModel.findOne({ name: 'Espada de plata' }))?._id, quantity: 1, priceAtTransaction: 250 }],
        totalAmount: 250
      },
      {
        type: 'sale',
        client: merchant._id,
        clientModel: 'Merchant',
        items: [{ good: (await GoodModel.findOne({ name: 'Poción de salud' }))?._id, quantity: 5, priceAtTransaction: 50 }],
        totalAmount: 250
      }
    ]);

    const res = await request(app)
      .get('/transactions/client')
      .query({ clientName: 'Geralt' })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('purchase');
  });

  test('GET /transactions/client → 400 si falta clientName', async () => {
    const res = await request(app)
      .get('/transactions/client')
      .expect(400);

    expect(res.body.error).toMatch(/Se requiere el nombre del cliente/);
  });

  test('GET /transactions/client → 404 si cliente no existe', async () => {
    const res = await request(app)
      .get('/transactions/client')
      .query({ clientName: 'NoExisto' })
      .expect(404);

    expect(res.body.error).toMatch(/Cliente no encontrado/);
  });

  // GET /transactions/date-range
  test('GET /transactions/date-range → 200 obtiene transacciones por rango de fechas', async () => {
    const { hunter } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    // Crear transacciones con fechas específicas
    await TransactionModel.create([
      {
        type: 'purchase',
        client: hunter._id,
        clientModel: 'Hunter',
        items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
        totalAmount: 250,
        date: new Date('2023-01-15')
      },
      {
        type: 'purchase',
        client: hunter._id,
        clientModel: 'Hunter',
        items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
        totalAmount: 250,
        date: new Date('2023-02-20')
      }
    ]);

    const res = await request(app)
      .get('/transactions/date-range')
      .query({ 
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(new Date(res.body[0].date)).toStrictEqual(new Date('2023-01-15'));
  });

  test('GET /transactions/date-range → 200 filtra por tipo y fecha', async () => {
    const { hunter, merchant } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    await TransactionModel.create([
      {
        type: 'purchase',
        client: hunter._id,
        clientModel: 'Hunter',
        items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
        totalAmount: 250,
        date: new Date('2023-03-10')
      },
      {
        type: 'sale',
        client: merchant._id,
        clientModel: 'Merchant',
        items: [{ good: good?._id, quantity: 1, priceAtTransaction: 250 }],
        totalAmount: 250,
        date: new Date('2023-03-15')
      }
    ]);

    const res = await request(app)
      .get('/transactions/date-range')
      .query({
        startDate: '2023-03-01',
        endDate: '2023-03-31',
        type: 'sale'
      })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('sale');
  });

  test('GET /transactions/date-range → 400 si faltan fechas', async () => {
    const res = await request(app)
      .get('/transactions/date-range')
      .query({ endDate: '2023-12-31' })
      .expect(400);

    expect(res.body.error).toMatch(/Se requieren fechas de inicio y fin/);
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
    expect(res.body.type).toBe('purchase');
  });

  test('GET /transactions/:id → 404 si transacción no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/transactions/${fakeId}`)
      .expect(404);

    expect(res.body.error).toMatch(/Transacción no encontrada/);
  });

  // DELETE /transactions/:id
  test('DELETE /transactions/:id → 200 elimina transacción y revierte stock', async () => {
    const { hunter } = await createTestData();
    const good = await GoodModel.findOne({ name: 'Espada de plata' });

    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: good?._id, quantity: 2, priceAtTransaction: 250 }],
      totalAmount: 500
    });

    // Verificar stock inicial (10 - 2 = 8)
    const initialStock = (await GoodModel.findById(good?._id))?.stock;
    expect(initialStock).toBe(8);

    const res = await request(app)
      .delete(`/transactions/${transaction._id}`)
      .expect(200);

    expect(res.body.message).toMatch(/Transacción eliminada correctamente/);

    // Verificar que se revirtió el stock (8 + 2 = 10)
    const updatedGood = await GoodModel.findById(good?._id);
    expect(updatedGood?.stock).toBe(10);

    // Verificar que la transacción fue eliminada
    const deletedTransaction = await TransactionModel.findById(transaction._id);
    expect(deletedTransaction).toBeNull();
  });

  test('DELETE /transactions/:id → 404 si transacción no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/transactions/${fakeId}`)
      .expect(404);

    expect(res.body.error).toMatch(/Transacción no encontrada/);
  });

  // PUT /transactions/:id
  test('PUT /transactions/:id → 200 actualiza transacción y ajusta stock', async () => {
    const { hunter, merchant } = await createTestData();
    const [sword, potion] = await GoodModel.find();

    // Crear transacción inicial
    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ good: sword._id, quantity: 1, priceAtTransaction: sword.value }],
      totalAmount: sword.value
    });

    // Stock inicial: sword (10 - 1 = 9), potion (20)

    // Actualizar a transacción de venta con diferentes items
    const res = await request(app)
      .put(`/transactions/${transaction._id}`)
      .send({
        type: 'sale',
        clientName: 'Zoltan',
        items: [
          { goodName: 'Poción de salud', quantity: 3 }
        ]
      })
      .expect(200);

    expect(res.body.type).toBe('sale');
    expect(res.body.client).toBe(merchant._id.toString());
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totalAmount).toBe(potion.value * 3);

    // Verificar stocks:
    // - Se revirtió la compra original: sword (9 + 1 = 10)
    // - Se aplicó la nueva venta: potion (20 + 3 = 23)
    const updatedSword = await GoodModel.findById(sword._id);
    const updatedPotion = await GoodModel.findById(potion._id);
    expect(updatedSword?.stock).toBe(10);
    expect(updatedPotion?.stock).toBe(23);
  });

  test('PUT /transactions/:id → 400 si datos inválidos', async () => {
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
      .put(`/transactions/${transaction._id}`)
      .send({
        type: 'invalid',
        clientName: 'Geralt',
        items: []
      })
      .expect(400);

    expect(res.body.error).toMatch(/Tipo de transacción no válido/);
  });

  test('PUT /transactions/:id → 404 si transacción no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/transactions/${fakeId}`)
      .send({
        type: 'purchase',
        clientName: 'Geralt',
        items: [{ goodName: 'Espada de plata', quantity: 1 }]
      })
      .expect(404);

    expect(res.body.error).toMatch(/Transacción no encontrada/);
  });
});