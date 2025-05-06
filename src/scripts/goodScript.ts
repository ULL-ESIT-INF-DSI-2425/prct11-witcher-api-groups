import { GoodModel, GoodDocument } from '../models/good.js';

export interface GoodInput {
  id: number;
  name: string;
  description?: string;
  material: string;
  weight: number;
  value: number;
}

export async function createGood(data: GoodInput): Promise<GoodDocument> {
  const good = new GoodModel(data);
  return await good.save();
}

export async function findGoodById(id: string): Promise<GoodDocument | null> {
  return await GoodModel.findById(id).exec();
}

export async function findGoodsByName(name: string): Promise<GoodDocument[]> {
  return await GoodModel.find({ name }).exec();
}

export async function updateOneGoodById(
  id: string,
  update: Partial<GoodInput>
): Promise<GoodDocument | null> {
  return await GoodModel.findByIdAndUpdate(id, update, { new: true }).exec();
}

export async function updateGoodsByName(
  currentName: string,
  update: Partial<GoodInput>
): Promise<number> {
  const res = await GoodModel.updateMany({ name: currentName }, update).exec();
  return res.modifiedCount;
}

export async function deleteOneGoodById(id: string): Promise<number> {
  const res = await GoodModel.deleteOne({ _id: id }).exec();
  return res.deletedCount ?? 0;
}

export async function deleteGoodsByName(name: string): Promise<number> {
  const res = await GoodModel.deleteMany({ name }).exec();
  return res.deletedCount ?? 0;
}
