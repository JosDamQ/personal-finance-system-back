import prisma from "../config/database";

export class CleanupService {
  /**
   * Clean expired refresh tokens and blacklisted tokens
   */
  static async cleanExpiredTokens(): Promise<void> {
    try {
      const now = new Date();

      // Delete expired refresh tokens
      const deletedRefreshTokens = await prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { isRevoked: true }],
        },
      });

      // Delete expired blacklisted tokens
      const deletedBlacklistedTokens = await prisma.tokenBlacklist.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      console.log(
        `🧹 Cleanup completed: ${deletedRefreshTokens.count} refresh tokens, ${deletedBlacklistedTokens.count} blacklisted tokens removed`,
      );
    } catch (error) {
      console.error("❌ Error during token cleanup:", error);
    }
  }

  /**
   * Start periodic cleanup (every 24 hours)
   */
  static startPeriodicCleanup(): void {
    // Run cleanup immediately
    this.cleanExpiredTokens();

    // Then run every 24 hours
    setInterval(
      () => {
        this.cleanExpiredTokens();
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours in milliseconds

    console.log("🧹 Periodic token cleanup started (every 24 hours)");
  }
}
