import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

export class CategoryRepository {
  async create(
    userId: string,
    data: { name: string; color?: string; icon?: string },
  ): Promise<Category> {
    return prisma.category.create({
      data: {
        userId,
        name: data.name,
        color: data.color || "#3B82F6",
        icon: data.icon || "💰",
      },
    });
  }

  async findByUserId(userId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { id, userId },
    });
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; color?: string; icon?: string },
  ): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Primero verificar que la categoría existe y pertenece al usuario
    const category = await this.findById(id, userId);
    if (!category) {
      throw new Error("Category not found");
    }

    if (category.isDefault) {
      throw new Error("Cannot delete default category");
    }

    // Obtener categoría por defecto para reasignar gastos
    const defaultCategory = await prisma.category.findFirst({
      where: { userId, isDefault: true },
    });

    if (!defaultCategory) {
      throw new Error("Default category not found");
    }

    // Reasignar gastos a categoría por defecto y eliminar categoría
    await prisma.$transaction([
      prisma.expense.updateMany({
        where: { categoryId: id },
        data: { categoryId: defaultCategory.id },
      }),
      prisma.category.delete({
        where: { id },
      }),
    ]);
  }

  async createDefaultCategories(userId: string): Promise<Category[]> {
    const defaultCategories = [
      { name: "General", color: "#3B82F6", icon: "💰", isDefault: true },
      { name: "Comida", color: "#EF4444", icon: "🍽️", isDefault: false },
      { name: "Transporte", color: "#F59E0B", icon: "🚗", isDefault: false },
      { name: "Entretenimiento", color: "#8B5CF6", icon: "🎬", isDefault: false },
      { name: "Salud", color: "#10B981", icon: "🏥", isDefault: false },
    ];

    const categories = await Promise.all(
      defaultCategories.map((category) =>
        prisma.category.create({
          data: {
            userId,
            ...category,
          },
        }),
      ),
    );

    return categories;
  }

  async checkNameExists(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const category = await prisma.category.findFirst({
      where: {
        userId,
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!category;
  }
}
