import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`Missing required env var: ${name}. Copy server/.env.example to server/.env and fill it in.`);
    process.exit(1);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  mongoUri: required("MONGO_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpire: optional("JWT_EXPIRE", "7d"),
  cookieExpireDays: Number(optional("COOKIE_EXPIRE", "7")),
  cloudinary: {
    name: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    mail: process.env.SENDGRID_MAIL,
    resetTemplateId: process.env.SENDGRID_RESET_TEMPLATEID,
  },
} as const;

export const isProduction = config.nodeEnv === "production";
