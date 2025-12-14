import "dotenv/config";
import app from "./app";
import prisma from "./config/database";
import redisClient from "./config/redis";
import { env } from "./config/env";

const PORT = env.PORT;

// Initialize connections and start server
async function startServer() {
  try {
    // Initialize Prisma connection
    await prisma.$connect();
    console.log("✅ Database connected");

    // Initialize Redis connection
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    console.log("✅ Redis connected");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);

  try {
    // Close Prisma connection
    await prisma.$disconnect();
    console.log("✅ Database disconnected");

    // Close Redis connection
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log("✅ Redis disconnected");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer();
