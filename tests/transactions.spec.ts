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
  await TransactionModel.deleteMany({});
  await GoodModel.deleteMany({});
  await HunterModel.deleteMany({});
  await MerchantModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('CRUD completo de /transactions', () => {
  // Helper para crear datos de prueba válidos
  const createValidGood = async () => {
    return await GoodModel.create({
      id: 1,
      name: 'Espada de plata',
      description: 'Arma efectiva contra bestias',
      material: 'acero',
      weight: 2.5,
      value: 100,
      stock: 10
    });
  };

  const createValidHunter = async () => {
    return await HunterModel.create({
      name: 'Geralt de Rivia',
      email: 'geralt@rivia.com',
      experience: 100, // Número en lugar de string
      type: 'brujo', // Tipo en español
      monsterSpecialty: ['vampiros', 'necrofagos'],
      rank: 'maestro'
    });
  };

  const createValidMerchant = async () => {
    return await MerchantModel.create({
      name: 'Zoltan Chivay',
      email: 'zoltan@mahakam.com',
      location: 'Novigrad',
      specialty: 'armas',
      shopName: 'La Herrería de Mahakam'
    });
  };

  // POST /transactions
  test('POST /transactions → 201 (crea transacción válida de compra)', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();

    const transaction = {
      type: 'purchase',
      clientName: hunter.name,
      items: [
        { goodName: good.name, quantity: 2 }
      ]
    };

    const res = await request(app)
      .post('/transactions')
      .send(transaction)
      .expect(201);
    
    expect(res.body.type).toBe('purchase');
    expect(res.body.totalAmount).toBe(good.value * 2);
  });

  test('POST /transactions → 400 si falta campo required', async () => {
    const badTransaction = { 
      clientName: 'Geralt de Rivia',
      items: [{ goodName: 'Espada', quantity: 1 }] 
    }; // falta type
    
    const res = await request(app)
      .post('/transactions')
      .send(badTransaction)
      .expect(400);
    
    expect(res.body).toHaveProperty('error');
  });

  test('POST /transactions → 400 si tipo no permitido', async () => {
    const hunter = await createValidHunter();
    
    const badTransaction = {
      type: 'invalid',
      clientName: hunter.name,
      items: [{ goodName: 'Espada', quantity: 1 }]
    };
    
    const res = await request(app)
      .post('/transactions')
      .send(badTransaction)
      .expect(400);
    
    expect(res.body.error).toMatch(/Tipo de transacción no válido/);
  });

  // GET /transactions/client
  test('GET /transactions/client → 404 si no hay ninguna', async () => {
    const hunter = await createValidHunter();
    await request(app)
      .get('/transactions/client')
      .query({ clientName: hunter.name })
      .expect(404);
  });

  test('GET /transactions/client → 200 y lista todas', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();
    
    await TransactionModel.create([
      {
        type: 'purchase',
        client: hunter._id,
        clientModel: 'Hunter',
        items: [{ 
          good: good._id, 
          quantity: 1, 
          priceAtTransaction: good.value 
        }],
        totalAmount: good.value
      }
    ]);

    const res = await request(app)
      .get('/transactions/client')
      .query({ clientName: hunter.name })
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  // GET /transactions/date-range
  test('GET /transactions/date-range → 200 y filtra por fecha', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();
    const today = new Date();
    
    await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ 
        good: good._id, 
        quantity: 1, 
        priceAtTransaction: good.value 
      }],
      totalAmount: good.value,
      date: today
    });

    const res = await request(app)
      .get('/transactions/date-range')
      .query({ 
        startDate: new Date(today.getTime() - 86400000).toISOString(),
        endDate: new Date(today.getTime() + 86400000).toISOString()
      })
      .expect(200);
    expect(res.body[0].type).toBe('purchase');
  });

  // GET /transactions/:id
  test('GET /transactions/:id → 200 si existe', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();
    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ 
        good: good._id, 
        quantity: 1, 
        priceAtTransaction: good.value 
      }],
      totalAmount: good.value
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

  test('GET /transactions/:id → 500 si id mal formado', async () => {
    await request(app)
      .get('/transactions/1234')
      .expect(500);
  });

  // PUT /transactions/:id
  test('PUT /transactions/:id → 200 actualiza transacción', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();
    const merchant = await createValidMerchant();
    
    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ 
        good: good._id, 
        quantity: 1, 
        priceAtTransaction: good.value 
      }],
      totalAmount: good.value
    });

    const updateData = {
      type: 'sale',
      clientName: merchant.name,
      items: [
        { goodName: good.name, quantity: 2 }
      ]
    };
    
    const res = await request(app)
      .put(`/transactions/${transaction._id}`)
      .send(updateData)
      .expect(200);
    
    expect(res.body.type).toBe('sale');
    expect(res.body.totalAmount).toBe(good.value * 2);
  });

  test('PUT /transactions/:id → 400 sin body', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();
    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ 
        good: good._id, 
        quantity: 1, 
        priceAtTransaction: good.value 
      }],
      totalAmount: good.value
    });
    await request(app)
      .put(`/transactions/${transaction._id}`)
      .expect(400);
  });

  test('PUT /transactions/:id → 404 si no existe', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app)
      .put(`/transactions/${fakeId}`)
      .send({ 
        type: 'purchase', 
        clientName: 'Geralt de Rivia', 
        items: [{ goodName: 'Espada', quantity: 1 }] 
      })
      .expect(404);
  });

  // DELETE /transactions/:id
  test('DELETE /transactions/:id → 200 elimina por id', async () => {
    const good = await createValidGood();
    const hunter = await createValidHunter();
    const transaction = await TransactionModel.create({
      type: 'purchase',
      client: hunter._id,
      clientModel: 'Hunter',
      items: [{ 
        good: good._id, 
        quantity: 1, 
        priceAtTransaction: good.value 
      }],
      totalAmount: good.value
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
});