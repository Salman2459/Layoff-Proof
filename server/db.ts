// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// // import ws from "ws";
// import * as schema from "@shared/schema";
// import 'dotenv/config';


// // neonConfig.webSocketConstructor = ws;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle({ client: pool, schema });

import { Pool } from 'pg'; // Use normal PostgreSQL client
import { drizzle } from 'drizzle-orm/node-postgres'; // Drizzle for plain Postgres
import * as schema from '@shared/schema';
import 'dotenv/config';

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create Postgres pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Drizzle with Postgres pool and schema
export const db = drizzle({ client: pool, schema });
