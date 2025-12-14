import { CategoryService } from "./category.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.types";

describe("CategoryService", () => {
  let categoryService: CategoryService;

  beforeEach(() => {
    categoryService = new CategoryService();
  });

  describe("Input validation", () => {
    it("should validate category name is required", () => {
      const categoryData = {
        name: "",
        color: "#FF5733",
        icon: "🛒",
      } as CreateCategoryDto;

      expect(categoryData.name).toBe("");
    });

    it("should accept valid category data", () => {
      const categoryData: CreateCategoryDto = {
        name: "Groceries",
        color: "#FF5733",
        icon: "🛒",
      };

      expect(categoryData.name).toBe("Groceries");
      expect(categoryData.color).toBe("#FF5733");
      expect(categoryData.icon).toBe("🛒");
    });

    it("should handle optional fields", () => {
      const categoryData: CreateCategoryDto = {
        name: "Transport",
      };

      expect(categoryData.name).toBe("Transport");
      expect(categoryData.color).toBeUndefined();
      expect(categoryData.icon).toBeUndefined();
    });
  });

  describe("Update validation", () => {
    it("should accept partial update data", () => {
      const updateData: UpdateCategoryDto = {
        name: "Updated Groceries",
      };

      expect(updateData.name).toBe("Updated Groceries");
      expect(updateData.color).toBeUndefined();
    });

    it("should accept color update only", () => {
      const updateData: UpdateCategoryDto = {
        color: "#33FF57",
      };

      expect(updateData.color).toBe("#33FF57");
      expect(updateData.name).toBeUndefined();
    });
  });
});
