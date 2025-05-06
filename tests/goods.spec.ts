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

describe('CRUD básico y pruebas avanzadas en /goods', () => {
  test('POST /goods → Debería crear un nuevo bien (status 201)', async () => {
    const newGood = {
      id:          1,
      name:        'Lanza del Destino',
      description: 'Arma legendaria',
      material:    'madera',
      weight:      3.4,
      value:       1000,
    };

    await request(app)
      .post('/goods')
      .send(newGood)
      .expect(201);
  });

  test('POST /goods → devuelve el objeto completo y se almacena en BD', async () => {
    const payload = {
      id:          42,
      name:        'Armadura de Kaer Morhen',
      description: 'Protección de acero',
      material:    'acero',
      weight:      12.5,
      value:       2500,
    };

    const res = await request(app)
      .post('/goods')
      .send(payload)
      .expect(201);

    expect(res.body).toMatchObject({
      id:       payload.id,
      name:     payload.name,
      material: payload.material,
      weight:   payload.weight,
      value:    payload.value,
    });
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');

    const fromDb = await GoodModel.findOne({ id: payload.id }).lean();
    expect(fromDb).not.toBeNull();
    expect(fromDb!.name).toBe(payload.name);
  });

  test('POST /goods con material inválido → 400 y mensaje de error', async () => {
    const bad = {
      id:       7,
      name:     'Espada de madera',
      material: 'oro',
      weight:   1.2,
      value:    100,
    };

    const res = await request(app)
      .post('/goods')
      .send(bad)
      .expect(400);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/no es un material permitido/);
  });

  test('GET /goods → lista todos los bienes insertados', async () => {
    await GoodModel.create([
      { id:1, name:'Bien A', material:'madera', weight:1, value:10 },
      { id:2, name:'Bien B', material:'plástico', weight:2, value:20 },
    ]);

    const res = await request(app)
      .get('/goods')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((g: any) => g.name)).toEqual(
      expect.arrayContaining(['Bien A', 'Bien B'])
    );
  });

  test('DELETE /goods/:id → elimina y no queda en BD', async () => {
    const doc = await GoodModel.create({
      id:3, name:'Escudo de valor', material:'acero', weight:5, value:500
    });

    await request(app)
      .delete(`/goods/${doc._id}`)
      .expect(200);

    const check = await GoodModel.findById(doc._id);
    expect(check).toBeNull();
  });

});
