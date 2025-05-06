// src/index.ts
import { connectMongoose } from './db/mongodb-mongoose.js';
import {
  createGood,
  findGoodById,
  findGoodsByName,
  updateOneGoodById,
  updateGoodsByName,
  deleteOneGoodById,
  deleteGoodsByName,
  GoodInput,
} from './scripts/goodScript.js';

async function main() {
  await connectMongoose();

  const input: GoodInput = {
    id:          10,
    name:        'Mesa de madera',
    description: 'Mesa reonda',
    material:    'madera',
    weight:      12,
    value:       150,
  };
  const g1 = await createGood(input);
  console.log('Creado:', g1);

  console.log('Por ID:', await findGoodById(g1._id.toString()));

  console.log('Por nombre:', await findGoodsByName('Mes8 de madera'));

  console.log(
    'Actualizado:',
    await updateOneGoodById(g1._id.toString(), { value: 175 })
  );

  console.log(
    'Modificados:',
    await updateGoodsByName('Mesa de madera', { description: 'Mesa redonda de pino' })
  );

  console.log(
    'Borrados uno:',
    await deleteOneGoodById(g1._id.toString())
  );

  console.log(
    'Borrados varios:',
    await deleteGoodsByName('Mesa de madera')
  );

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
