import { MongoClient, type Db, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const allowInsecureTls = process.env.MONGODB_TLS_INSECURE === "true";

const options = {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } as const,
  ...(allowInsecureTls ? { tlsAllowInvalidCertificates: true } : {}),
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  if (!client) throw new Error("MongoDB client not initialized");
  const dbName = process.env.MONGODB_DB_NAME || "HomeAPP";
  return client.db(dbName);
}

export async function connectToDatabase(): Promise<void> {
  await clientPromise;
}

/* Código legado eliminado — la función connectToDatabase con retorno { client, db }
   fue reemplazada por getDatabase(). Ref: refactor de conexión MongoDB.

import { MongoClient, type Db, ServerApiVersion } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI

// Optional local-only escape hatch for tricky Windows TLS chains or intercepting proxies.
// Set MONGODB_TLS_INSECURE="true" locally to try bypassing cert validation while you fix your environment.
// DO NOT enable in production.
const allowInsecureTls = process.env.MONGODB_TLS_INSECURE === "true"

const options = {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } as const,
  ...(allowInsecureTls ? { tlsAllowInvalidCertificates: true } : {}),
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise
  const dbName = process.env.MONGODB_DB_NAME || "HomeAPP"
  return client.db(dbName)
}

export async function connectToDatabase(dbName?: string): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise
  const name = dbName || process.env.MONGODB_DB_NAME || "HomeAPP"
  const db = client.db(name)
  return { client, db }
}

export async function getDb(dbName?: string): Promise<Db> {
  const { db } = await connectToDatabase(dbName)
  return db
}
 */