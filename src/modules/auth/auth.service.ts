import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import prisma from "../../config/database";
import redisClient from "../../config/redis";
import { env } from "../../config/env";
import { ValidationError, ConflictError, AuthenticationError } from "../../utils/errors";
import type {
  RegisterDTO,
  TokenPair,
  TokenPayload,
  UserResponse,
  LoginDTO,
  OAuthDTO,
  GooglePayload,
  ApplePayload,
} from "./types";

class AuthService {
  /**
   * Login with email and password
   */
  async login(data: LoginDTO): Promise<{ user: UserResponse; tokens: TokenPair }> {
    const { email, password } = data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Compare password with bcrypt
    const isPasswordValid = await this.comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Generate Access Token (15 min) and Refresh Token (30 days)
    const tokens = await this.generateTokenPair(user.id);

    // Return user data (excluding password) and tokens
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      oauthProvider: user.oauthProvider,
      createdAt: user.createdAt,
    };

    return {
      user: userResponse,
      tokens,
    };
  }

  async register(data: RegisterDTO): Promise<{ user: UserResponse; tokens: TokenPair }> {
    const { email, password, name, phone } = data;

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    // Validate password length
    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long");
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError("Email already in use");
    }

    // Hash password with bcrypt
    const hashedPassword = await this.hashPassword(password);

    // Create user in database with default role CLIENT
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        phone: phone || null,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id);

    // Return user data (excluding password) and tokens
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      oauthProvider: user.oauthProvider,
      createdAt: user.createdAt,
    };

    return {
      user: userResponse,
      tokens,
    };
  }

  /**
   * Hash password using bcrypt with cost factor 10
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash using bcrypt
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate Access Token and Refresh Token pair
   */
  private async generateTokenPair(
    userId: string,
    role: string = "CLIENT",
  ): Promise<TokenPair> {
    const sessionId = uuidv4();

    // Generate Access Token (15 minutes)
    const accessTokenPayload: TokenPayload = {
      userId,
      role,
      sessionId,
    };

    console.log("JWT_SECRET:", env.JWT_SECRET);

    const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // Generate Refresh Token (30 days)
    const refreshTokenPayload = {
      userId,
      sessionId,
    };

    const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Store Refresh Token in Redis - Requirement 2.3
    await this.storeRefreshToken(userId, sessionId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Store Refresh Token in Redis with TTL
   */
  private async storeRefreshToken(
    userId: string,
    sessionId: string,
    token: string,
  ): Promise<void> {
    const key = `refresh:${userId}:${sessionId}`;
    const ttl = 30 * 24 * 60 * 60; // 30 days in seconds

    await redisClient.setEx(key, ttl, token);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Verify Google ID Token
   */
  private async verifyGoogleToken(idToken: string): Promise<GooglePayload> {
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email) {
        throw new AuthenticationError("Invalid Google token payload");
      }

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified || false,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      throw new AuthenticationError("Failed to verify Google token");
    }
  }

  /**
   * Verify Apple ID Token
   */
  private async verifyAppleToken(idToken: string): Promise<ApplePayload> {
    try {
      const applePayload = await appleSignin.verifyIdToken(idToken, {
        audience: env.APPLE_CLIENT_ID,
        ignoreExpiration: false,
      });

      if (!applePayload || !applePayload.sub || !applePayload.email) {
        throw new AuthenticationError("Invalid Apple token payload");
      }

      return {
        sub: applePayload.sub,
        email: applePayload.email,
        email_verified: applePayload.email_verified,
        name: undefined, // Apple doesn't always provide name in token
      };
    } catch (error) {
      throw new AuthenticationError("Failed to verify Apple token");
    }
  }

  /**
   * OAuth login for Google and Apple
   */
  async oauthLogin(data: OAuthDTO): Promise<{ user: UserResponse; tokens: TokenPair }> {
    const { idToken, provider } = data;

    let oauthPayload: { sub: string; email: string; name?: string };

    // Validate the ID Token based on provider
    if (provider === "google") {
      // Validate with Google
      oauthPayload = await this.verifyGoogleToken(idToken);
    } else if (provider === "apple") {
      // Validate with Apple
      oauthPayload = await this.verifyAppleToken(idToken);
    } else {
      throw new ValidationError("Unsupported OAuth provider");
    }

    // Search for existing user by oauthProvider and oauthId
    let user = await prisma.user.findFirst({
      where: {
        oauthProvider: provider,
        oauthId: oauthPayload.sub,
      },
    });

    // If user doesn't exist, create new user with OAuth data
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: oauthPayload.email,
          name: oauthPayload.name || null,
          password: null, // OAuth users don't have password
          oauthProvider: provider,
          oauthId: oauthPayload.sub, // Store OAuth user ID
        },
      });
    }

    // Generate Access Token and Refresh Token
    const tokens = await this.generateTokenPair(user.id);

    // Return tokens and user data
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      oauthProvider: user.oauthProvider,
      createdAt: user.createdAt,
    };

    return {
      user: userResponse,
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify that the Refresh Token is valid (JWT)
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET) as any;
    } catch (error) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    const { userId, sessionId } = payload;

    if (!userId || !sessionId) {
      throw new AuthenticationError("Invalid refresh token payload");
    }

    // Look up the token in Redis
    const key = `refresh:${userId}:${sessionId}`;
    const storedToken = await redisClient.get(key);

    // If token doesn't exist in Redis, reject the request
    if (!storedToken) {
      throw new AuthenticationError("Refresh token not found or expired");
    }

    // Verify the stored token matches the provided token
    if (storedToken !== refreshToken) {
      throw new AuthenticationError("Invalid refresh token");
    }

    // Get user to retrieve role for new access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Delete the old Refresh Token from Redis
    await this.deleteRefreshToken(userId, sessionId);

    // Generate new Access Token (15 min) and new Refresh Token (30 days)
    const newTokens = await this.generateTokenPair(user.id);

    // Return both tokens
    return newTokens;
  }

  /**
   * Delete Refresh Token from Redis
   */
  private async deleteRefreshToken(userId: string, sessionId: string): Promise<void> {
    const key = `refresh:${userId}:${sessionId}`;
    await redisClient.del(key);
  }

  /**
   * Logout user - revoke tokens
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    // Extract userId and sessionId from Access Token
    let payload: any;
    try {
      payload = jwt.verify(accessToken, env.JWT_SECRET) as any;
    } catch (error) {
      // Even if token is expired or invalid, we should still try to clean up
      // Try to decode without verification to get the payload
      try {
        payload = jwt.decode(accessToken) as any;
      } catch {
        throw new AuthenticationError("Invalid access token");
      }
    }

    const { userId, sessionId, exp } = payload;

    if (!userId || !sessionId) {
      throw new AuthenticationError("Invalid token payload");
    }

    // Delete the Refresh Token from Redis - Requirement 6.1
    await this.deleteRefreshToken(userId, sessionId);

    // Add the Access Token to the blacklist - Requirement 6.2
    // Calculate TTL as remaining time until expiration - Requirement 6.3
    if (exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const ttl = exp - currentTime;

      // Only add to blacklist if token hasn't expired yet
      if (ttl > 0) {
        await this.addToBlacklist(accessToken, ttl);
      }
    }

    // Return confirmation of success - Requirement 6.4
  }

  /**
   * Add Access Token to blacklist in Redis
   */
  private async addToBlacklist(token: string, ttl: number): Promise<void> {
    const key = `blacklist:${token}`;
    await redisClient.setEx(key, ttl, "1");
  }

  /**
   * Check if Access Token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const result = await redisClient.get(key);
    return result !== null;
  }
}

export default new AuthService();
