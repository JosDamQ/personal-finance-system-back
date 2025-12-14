import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../../config/database";
import { env } from "../../config/env";
import type { RegisterRequest, LoginRequest, AuthResponse, TokenPayload } from "./auth.types";

export class AuthService {
  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password, name } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET) as any;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }

    const { userId, sessionId } = payload;

    // Check if refresh token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId,
        sessionId,
        isRevoked: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!storedToken) {
      throw new Error("Refresh token not found or expired");
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true }
    });

    // Generate new tokens
    const tokens = await this.generateTokens(userId);

    return tokens;
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    // Revoke refresh token
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true }
    });
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = uuidv4();

    // Generate access token (15 minutes)
    const accessTokenPayload: TokenPayload = {
      userId,
      sessionId,
    };

    const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, {
      expiresIn: "15m"
    });

    // Generate refresh token (30 days)
    const refreshTokenPayload = {
      userId,
      sessionId,
    };

    const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_SECRET, {
      expiresIn: "30d"
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        sessionId,
        expiresAt,
      }
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      
      // Check if token is blacklisted
      const blacklisted = await prisma.tokenBlacklist.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() }
        }
      });

      if (blacklisted) {
        throw new Error("Token is blacklisted");
      }

      return payload;
    } catch (error) {
      throw new Error("Invalid access token");
    }
  }
}