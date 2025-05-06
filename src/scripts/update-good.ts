import { connectMongoose } from '../db/mongoose.js';
import { GoodModel, GoodDocument } from '../models/good.js';

async function updateOneGoodById(id: string, update: Partial<GoodDocument>) {
  const updated = await GoodModel.findByIdAndUpdate(id, update, { new: true }).exec();
  console.log('Updated document:', updated);
}

async function updateGoodsByName(currentName: string, update: Partial<GoodDocument>) {
  const { modifiedCount } = await GoodModel.updateMany({ name: currentName }, update).exec();
  console.log(`Modified count (name = ${currentName}):`, modifiedCount);
}

(async () => {
  await connectMongoose();

  await updateOneGoodById('6819c55713acd7b653a205f4', {
    name:  'Laptop Gaming Updated',
    value: 1399.99,
  });

  await updateGoodsByName('Laptop Gaming3', {
    description: 'Portátil3 – actualizado',
    material:    'Aluminio3+Acero',
  });

  process.exit(0);
})();