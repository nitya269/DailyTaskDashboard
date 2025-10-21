import pg from "pg";
const { Pool } = pg;
import { config } from "./config.js";

export const pool = new Pool({
  user: config.db.user,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  ssl: config.db.ssl
    ? { rejectUnauthorized: false } // Required for Neon
    : false,
});