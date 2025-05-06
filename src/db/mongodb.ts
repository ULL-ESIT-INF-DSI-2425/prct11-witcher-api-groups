import { MongoClient } from 'mongodb';

const dbURL = 'mongodb://127.0.0.1:27017';
const dbName = 'Lobo-Blanco';

const clientPromise = MongoClient.connect(dbURL);

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}