import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

export class CategoryRepository {
  async create(
    userId: string,
    data: { name: string; color?: string; icon?: string; isDefault?: boolean },
  ): Promise<Category> {
    // Si no hay categorías para este usuario, hacer esta la primera por defecto
    const existingCategories = await this.findByUserId(userId);
    const shouldBeDefault = data.isDefault || existingCategories.length === 0;

    // Si se está marcando como default, desmarcar las otras
    if (shouldBeDefault) {
      await prisma.category.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.category.create({
      data: {
        userId,
        name: data.name,
        color: data.color || "#3B82F6",
        icon: data.icon || "💰",
        isDefault: shouldBeDefault,
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
    data: { name?: string; color?: string; icon?: string; isDefault?: boolean },
  ): Promise<Category> {
    // Si se está marcando como default, desmarcar las otras
    if (data.isDefault === true) {
      await prisma.category.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Usar transacción para asegurar consistencia
    await prisma.$transaction(async (tx) => {
      // Verificar que la categoría existe y pertenece al usuario
      const category = await tx.category.findFirst({
        where: { id, userId },
      });
      
      if (!category) {
        throw new Error("Category not found");
      }

      if (category.isDefault) {
        throw new Error("Cannot delete default category");
      }

      // Buscar categoría por defecto
      let defaultCategory = await tx.category.findFirst({
        where: { userId, isDefault: true },
      });

      // Si no hay categoría por defecto, crear una
      if (!defaultCategory) {
        defaultCategory = await tx.category.create({
          data: {
            userId,
            name: "General",
            color: "#3B82F6",
            icon: "💰",
            isDefault: true,
          },
        });
      }

      // Reasignar gastos a categoría por defecto
      await tx.expense.updateMany({
        where: { categoryId: id },
        data: { categoryId: defaultCategory.id },
      });

      // Eliminar la categoría
      await tx.category.delete({
        where: { id },
      });
    });
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
