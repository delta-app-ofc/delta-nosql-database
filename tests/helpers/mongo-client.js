import { MongoClient } from "mongodb";

export const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017";

// O driver fica restrito às asserções; os scripts continuam no mongosh.
export async function connectMongo(
  uri = process.env.MONGODB_URI ?? DEFAULT_MONGODB_URI,
  options = {}
) {
  const client = new MongoClient(uri, options);
  await client.connect();
  return client;
}

export async function closeMongo(client) {
  if (client) {
    await client.close();
  }
}
