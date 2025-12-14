import { CategoryRepository } from "./category.repository";
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponse } from "./category.types";

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async createCategory(
    userId: string,
    data: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    // Validar que el nombre no exista
    const nameExists = await this.categoryRepository.checkNameExists(userId, data.name);
    if (nameExists) {
      throw new Error("Category name already exists");
    }

    const category = await this.categoryRepository.create(userId, data);
    return this.mapToResponse(category);
  }

  async getUserCategories(userId: string): Promise<CategoryResponse[]> {
    const categories = await this.categoryRepository.findByUserId(userId);
    return categories.map(this.mapToResponse);
  }

  async getCategoryById(id: string, userId: string): Promise<CategoryResponse> {
    const category = await this.categoryRepository.findById(id, userId);
    if (!category) {
      throw new Error("Category not found");
    }
    return this.mapToResponse(category);
  }

  async updateCategory(
    id: string,
    userId: string,
    data: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    // Verificar que la categoría existe
    const existingCategory = await this.categoryRepository.findById(id, userId);
    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Si se está actualizando el nombre, verificar que no exista
    if (data.name && data.name !== existingCategory.name) {
      const nameExists = await this.categoryRepository.checkNameExists(
        userId,
        data.name,
        id,
      );
      if (nameExists) {
        throw new Error("Category name already exists");
      }
    }

    const updatedCategory = await this.categoryRepository.update(id, userId, data);
    return this.mapToResponse(updatedCategory);
  }

  async deleteCategory(id: string, userId: string): Promise<void> {
    await this.categoryRepository.delete(id, userId);
  }

  async initializeDefaultCategories(userId: string): Promise<CategoryResponse[]> {
    // Verificar si ya tiene categorías
    const existingCategories = await this.categoryRepository.findByUserId(userId);
    if (existingCategories.length > 0) {
      return existingCategories.map(this.mapToResponse);
    }

    // Crear categorías por defecto
    const defaultCategories =
      await this.categoryRepository.createDefaultCategories(userId);
    return defaultCategories.map(this.mapToResponse);
  }

  private mapToResponse(category: any): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      isDefault: category.isDefault,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
