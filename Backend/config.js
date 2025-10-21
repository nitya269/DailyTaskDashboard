import dotenv from "dotenv";
dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 5000,
  },
  db: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_secret",
  },
};