// tests/goods.spec.ts
import { describe, beforeAll, afterAll, beforeEach, test, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { setupApp } from '../src/app.js';
import { GoodModel } from '../src/models/good.js';

let app: ReturnType<typeof setupApp>;

beforeAll(async () => {
  app = await setupApp();
});

beforeEach(async () => {
  await GoodModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('CRUD completo de /goods', () => {

  // POST /goods
  test('POST /goods → 201 (crea bien válido)', async () => {
    const good = {
      id:          1,
      name:        'BienUno',
      description: 'Descripción A',
      material:    'madera',
      weight:      1,
      value:       10
    };
    await request(app).post('/goods').send(good).expect(201);
  });

  test('POST /goods → 400 si falta campo required', async () => {
    const bad = { name:'Bueno', material:'acero', weight:2, value:20 }; // falta id
    const res = await request(app).post('/goods').send(bad).expect(400);
    expect(res.body).toHaveProperty('errors.id');
  });

  test('POST /goods → 400 si material no permitido', async () => {
    const bad = {
      id:       2,
      name:     'BienDos',
      material: 'oro',
      weight:   1.2,
      value:    5
    };
    const res = await request(app).post('/goods').send(bad).expect(400);
    expect(res.body.message).toMatch(/no es un material permitido/);
  });

  // GET /goods
  test('GET /goods → 404 si no hay ninguno', async () => {
    await request(app).get('/goods').expect(404);
  });

  test('GET /goods → 200 y lista todos', async () => {
    await GoodModel.create([
      { id:3, name:'BienA', material:'plástico', weight:3, value:30 },
      { id:4, name:'BienB', material:'vidrio', weight:4, value:40 },
    ]);
    const res = await request(app).get('/goods').expect(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /goods?name=BienA → 200 y filtra por name', async () => {
    await GoodModel.create({ id:5, name:'FiltroX', material:'madera', weight:5, value:50 });
    const res = await request(app).get('/goods').query({ name:'FiltroX' }).expect(200);
    expect(res.body[0].name).toBe('FiltroX');
  });

  test('GET /goods?description=DescX → 200 y filtra por description', async () => {
    await GoodModel.create({
      id:6,
      name:'ConDesc',
      description:'DescX',
      material:'acero',
      weight:6,
      value:60
    });
    const res = await request(app).get('/goods')
      .query({ description:'DescX' }).expect(200);
    expect(res.body[0].description).toBe('DescX');
  });

  // GET /goods/:id
  test('GET /goods/:id → 200 si existe', async () => {
    const doc = await GoodModel.create({
      id:7,
      name:'GoodSeven',
      material:'aluminio',
      weight:7,
      value:70
    });
    const res = await request(app).get(`/goods/${doc._id}`).expect(200);
    expect(res.body.name).toBe('GoodSeven');
  });

  test('GET /goods/:id → 404 si no existe', async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).get(`/goods/${fake}`).expect(404);
  });

  test('GET /goods/:id → 500 si id mal formado', async () => {
    await request(app).get('/goods/1234').expect(500);
  });

  // PATCH /goods?name=…
  test('PATCH /goods?name=BienA → 200 modifica por name', async () => {
    await GoodModel.create({ id:8, name:'OldName', material:'plástico', weight:8, value:80 });
    const res = await request(app)
      .patch('/goods')
      .query({ name:'OldName' })
      .send({ value: 88 })
      .expect(200);
    expect(res.body.value).toBe(88);
  });

  test('PATCH /goods?name=… → 400 sin name', async () => {
    await request(app).patch('/goods').send({ value:10 }).expect(400);
  });

  test('PATCH /goods?name=… → 400 sin body', async () => {
    await request(app).patch('/goods').query({ name:'X' }).expect(400);
  });

  test('PATCH /goods?name=… → 400 campo no permitido', async () => {
    await GoodModel.create({ id:9, name:'ValidName', material:'madera', weight:9, value:90 });
    await request(app)
      .patch('/goods')
      .query({ name:'ValidName' })
      .send({ color:'rojo' })
      .expect(400);
  });

  test('PATCH /goods?name=… → 404 si no existe', async () => {
    await request(app)
      .patch('/goods')
      .query({ name:'NonExist' })
      .send({ value:100 })
      .expect(404);
  });

  // PATCH /goods/:id
  test('PATCH /goods/:id → 200 modifica por id', async () => {
    const doc = await GoodModel.create({
      id:10,
      name:'TenName',
      material:'vidrio',
      weight:10,
      value:100
    });
    const res = await request(app)
      .patch(`/goods/${doc._id}`)
      .send({ name:'TenName2' })
      .expect(200);
    expect(res.body.name).toBe('TenName2');
  });

  test('PATCH /goods/:id → 400 sin body', async () => {
    const doc = await GoodModel.create({
      id:11,
      name:'ElevenName',
      material:'madera',
      weight:11,
      value:110
    });
    await request(app).patch(`/goods/${doc.__id}`).expect(400);
  });

  test('PATCH /goods/:id → 400 campo no permitido', async () => {
    const doc = await GoodModel.create({
      id:12,
      name:'TwelveName',
      material:'acero',
      weight:12,
      value:120
    });
    await request(app)
      .patch(`/goods/${doc._id}`)
      .send({ foo:'bar' })
      .expect(400);
  });

  test('PATCH /goods/:id → 404 si no existe', async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app)
      .patch(`/goods/${fake}`)
      .send({ value:123 })
      .expect(404);
  });

  // DELETE /goods?name=…
  test('DELETE /goods?name=ValidName → 200 elimina por name', async () => {
    await GoodModel.create({
      id:13,
      name:'ValidName',
      material:'plástico',
      weight:13,
      value:130
    });
    await request(app)
      .delete('/goods')
      .query({ name:'ValidName' })
      .expect(200);
    expect(await GoodModel.findOne({ name:'ValidName' })).toBeNull();
  });

  test('DELETE /goods?name=… → 400 sin name', async () => {
    await request(app).delete('/goods').expect(400);
  });

  test('DELETE /goods?name=… → 404 si no existe', async () => {
    await request(app)
      .delete('/goods')
      .query({ name:'NopeName' })
      .expect(404);
  });

  // DELETE /goods/:id
  test('DELETE /goods/:id → 200 elimina por id', async () => {
    const doc = await GoodModel.create({
      id:14,
      name:'X14Name',
      material:'aluminio',
      weight:14,
      value:140
    });
    await request(app).delete(`/goods/${doc._id}`).expect(200);
    expect(await GoodModel.findById(doc._id)).toBeNull();
  });

  test('DELETE /goods/:id → 404 si no existe', async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    await request(app).delete(`/goods/${fake}`).expect(404);
  });

});
