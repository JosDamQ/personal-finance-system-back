export interface CreateCategoryDto {
  name: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface CategoryResponse {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
