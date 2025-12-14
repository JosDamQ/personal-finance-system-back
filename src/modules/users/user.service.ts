import prisma from "../../config/database";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/errors";
import type { UpdateUserDTO, UserResponse, UpdatePasswordDTO } from "./types";
import { hash, compare } from "bcrypt";

class UserService {
    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<UserResponse> {
        // Search for user in database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                oauthProvider: true,
                createdAt: true,
                // Explicitly exclude password from response
                password: false,
            },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Return user data without password
        // return {
        //     id: user.id,
        //     email: user.email,
        //     name: user.name,
        //     phone: user.phone,
        //     role: user.role,
        //     oauthProvider: user.oauthProvider,
        //     createdAt: user.createdAt,
        // };
        return user;
    }

    /**
     * Update user profile
     */
    async updateUser(userId: string, data: UpdateUserDTO): Promise<UserResponse> {
        // Validate update data
        this.validateUpdateData(data);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            throw new NotFoundError("User not found");
        }

        // If email is being updated, verify it's not already in use
        if (data.email && data.email !== existingUser.email) {
            const emailInUse = await this.emailExists(data.email);
            if (emailInUse) {
                throw new ConflictError("Email already in use");
            }
        }

        // Prepare update data - do not allow modification of OAuth fields
        const updateData: any = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }

        if (data.phone !== undefined) {
            updateData.phone = data.phone;
        }

        if (data.email !== undefined) {
            updateData.email = data.email;
        }

        // Update user in database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                oauthProvider: true,
                createdAt: true,
                // Explicitly exclude password from response
                password: false,
            },
        });

        // Return updated user data without password
        // return {
        //     id: updatedUser.id,
        //     email: updatedUser.email,
        //     name: updatedUser.name,
        //     phone: updatedUser.phone,
        //     role: updatedUser.role,
        //     oauthProvider: updatedUser.oauthProvider,
        //     createdAt: updatedUser.createdAt,
        // };
        return updatedUser;
    }

    /*
     * update password
     */
    async updatePassword(userId: string, data: UpdatePasswordDTO): Promise<UserResponse> {
        const { currentPassword, newPassword } = data;

        // Fetch user to verify current password
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Verify current password
        const isMatch = await compare(currentPassword, user.password!);
        if (!isMatch) {
            throw new ValidationError("Current password is incorrect");
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 10);

        // Update password in database
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return this.getUserById(userId);
    }

    /**
     * Check if email exists in database
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        return user !== null;
    }

    /**
     * Validate update data format
     */
    private validateUpdateData(data: UpdateUserDTO): void {
        // Validate email format if provided
        if (data.email !== undefined) {
            if (typeof data.email !== "string" || !this.isValidEmail(data.email)) {
                throw new ValidationError("Invalid email format");
            }
        }

        // Validate name if provided
        if (data.name !== undefined && typeof data.name !== "string") {
            throw new ValidationError("Name must be a string");
        }

        // Validate phone if provided
        if (
            data.phone !== undefined &&
            data.phone !== null &&
            typeof data.phone !== "string"
        ) {
            throw new ValidationError("Phone must be a string");
        }

        // Ensure no OAuth fields are being modified
        if ("oauthProvider" in data || "oauthId" in data) {
            throw new ValidationError("Cannot modify OAuth fields");
        }

        // Ensure no password field is being modified through this method
        if ("password" in data) {
            throw new ValidationError("Cannot modify password through profile update");
        }

        // Ensure no role field is being modified
        if ("role" in data) {
            throw new ValidationError("Cannot modify role through profile update");
        }
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

export default new UserService();
