import { config } from "dotenv";

config();

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_ACCESS_EXPIRATION",
  "JWT_REFRESH_EXPIRATION",
  "PORT",
  "NODE_ENV",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate JWT_SECRET is not using default value
if (process.env.JWT_SECRET === "your-super-secret-jwt-key-change-in-production") {
  console.warn("WARNING: Using default JWT_SECRET. Please change this in production!");
}

// OAuth variables are optional - only validate if OAuth is being used
const validateOAuthGoogle = (): boolean => {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID.trim() !== "" &&
    !process.env.GOOGLE_CLIENT_ID.includes("your-google-client-id")
  ) {
    return true;
  }
  return false;
};

const validateOAuthApple = (): boolean => {
  const hasAppleConfig =
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY;

  if (
    hasAppleConfig &&
    !process.env.APPLE_CLIENT_ID!.includes("your-apple-client-id") &&
    process.env.APPLE_CLIENT_ID!.trim() !== ""
  ) {
    return true;
  }
  return false;
};

export const env = {
  // Server
  PORT: parseInt(process.env.PORT!, 10),
  NODE_ENV: process.env.NODE_ENV!,

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION!,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION!,

  // OAuth Google
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_OAUTH_ENABLED: validateOAuthGoogle(),

  // OAuth Apple
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || "",
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || "",
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || "",
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY || "",
  APPLE_OAUTH_ENABLED: validateOAuthApple(),
};
