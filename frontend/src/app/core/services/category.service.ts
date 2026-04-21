import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CategoryNode {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  level: number;
  path: string;
  sort_order: number;
  default_hsn: string | null;
  default_gst_rate: number | null;
  default_uom: string | null;
  allow_items: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: CategoryNode[];
  item_count?: number;
  stock_value?: number;
}

export interface CreateCategoryDTO {
  name: string;
  code?: string;
  parent_id?: string | null;
  default_hsn?: string;
  default_gst_rate?: number | null;
  default_uom?: string;
  description?: string;
  allow_items?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  code?: string;
  sort_order?: number;
  parent_id?: string | null;
  default_hsn?: string;
  default_gst_rate?: number | null;
  default_uom?: string;
  description?: string;
  allow_items?: boolean;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inventory/categories`;

  /**
   * Get complete nested tree for organization
   */
  getTree(): Observable<CategoryNode[]> {
    return this.http.get<CategoryNode[]>(`${this.apiUrl}/tree`);
  }

  /**
   * Get only top-level groups (for dropdowns)
   */
  getGroups(): Observable<CategoryNode[]> {
    return this.http.get<CategoryNode[]>(`${this.apiUrl}/groups`);
  }

  /**
   * Get direct children of a category
   */
  getChildren(categoryId: string): Observable<CategoryNode[]> {
    return this.http.get<CategoryNode[]>(`${this.apiUrl}/${categoryId}/children`);
  }

  /**
   * Get breadcrumb path from root to category
   */
  getBreadcrumb(categoryId: string): Observable<CategoryNode[]> {
    return this.http.get<CategoryNode[]>(`${this.apiUrl}/${categoryId}/breadcrumb`);
  }

  /**
   * Get all descendants of category
   */
  getDescendants(categoryId: string): Observable<CategoryNode[]> {
    return this.http.get<CategoryNode[]>(`${this.apiUrl}/${categoryId}/descendants`);
  }

  /**
   * Get single category by ID
   */
  getCategoryById(categoryId: string): Observable<CategoryNode> {
    return this.http.get<CategoryNode>(`${this.apiUrl}/${categoryId}`);
  }

  /**
   * Create new category
   */
  createCategory(data: CreateCategoryDTO): Observable<CategoryNode> {
    return this.http.post<CategoryNode>(`${this.apiUrl}`, data);
  }

  /**
   * Update category
   */
  updateCategory(categoryId: string, data: UpdateCategoryDTO): Observable<CategoryNode> {
    return this.http.patch<CategoryNode>(`${this.apiUrl}/${categoryId}`, data);
  }

  /**
   * Move category to different parent
   */
  moveCategory(categoryId: string, newParentId: string | null): Observable<CategoryNode> {
    return this.http.patch<CategoryNode>(`${this.apiUrl}/${categoryId}/move`, { parent_id: newParentId });
  }

  /**
   * Delete category
   */
  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${categoryId}`);
  }

  /**
   * Get count of items in category and descendants
   */
  getItemCount(categoryId: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/${categoryId}/item-count`);
  }

  /**
   * Get total stock value for category and descendants
   */
  getStockValue(categoryId: string): Observable<{ stock_value: number }> {
    return this.http.get<{ stock_value: number }>(`${this.apiUrl}/${categoryId}/stock-value`);
  }
}
