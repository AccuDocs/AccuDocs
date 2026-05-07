import { injectable, inject } from 'tsyringe';
import { pool } from '../../../../config/database.config';
import { AppError } from '../../../../utils/errors';

export interface CategoryNode {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  level: number;
  path: string | null;
  sort_order: number;
  default_hsn: string | null;
  default_gst_rate: number | null;
  default_uom: string | null;
  allow_items: boolean;
  description: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  children?: CategoryNode[];
  item_count?: number;
  stock_value?: number;
}

export interface CreateCategoryDTO {
  name: string;
  code?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  default_hsn?: string | null;
  default_gst_rate?: number | null;
  default_uom?: string | null;
  allow_items?: boolean;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  code?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  default_hsn?: string | null;
  default_gst_rate?: number | null;
  default_uom?: string | null;
  allow_items?: boolean;
  description?: string;
  is_active?: boolean;
}

const CATEGORY_COLUMNS = `
  id, org_id, name, code, parent_id, level, path, sort_order,
  default_hsn, default_gst_rate, default_uom, allow_items,
  description, is_active, created_at, updated_at
`;

@injectable()
export class CategoryService {
  constructor() {}

  /**
   * Get complete nested tree for organization
   * Uses recursive CTE for full depth traversal
   */
  async getTree(orgId: string, includeInactive: boolean = false): Promise<CategoryNode[]> {
    const query = `
      WITH RECURSIVE cat_tree AS (
        -- Base: top-level categories (parent_id IS NULL)
        SELECT 
          ${CATEGORY_COLUMNS}
        FROM item_categories
        WHERE org_id = $1 AND parent_id IS NULL
        ${!includeInactive ? 'AND is_active = true' : ''}
        
        UNION ALL
        
        -- Recursive: children of categories already selected
        SELECT 
          c.id, c.org_id, c.name, c.code, c.parent_id, c.level, c.path, c.sort_order,
          c.default_hsn, c.default_gst_rate, c.default_uom, c.allow_items,
          c.description, c.is_active, c.created_at, c.updated_at
        FROM item_categories c
        JOIN cat_tree p ON c.parent_id = p.id
        ${!includeInactive ? 'WHERE c.is_active = true' : ''}
      )
      SELECT * FROM cat_tree
      ORDER BY path, sort_order, name
    `;

    const result = await pool.query(query, [orgId]);
    return this.buildNestedTree(result.rows);
  }

  /**
   * Get only top-level groups (parent_id IS NULL)
   */
  async getGroups(orgId: string): Promise<CategoryNode[]> {
    const query = `
      SELECT 
        ${CATEGORY_COLUMNS},
        (SELECT COUNT(*) FROM items WHERE category_id = ic.id) as item_count
      FROM item_categories ic
      WHERE org_id = $1 AND parent_id IS NULL AND is_active = true
      ORDER BY sort_order, name
    `;

    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  /**
   * Get direct children of a category
   */
  async getChildren(categoryId: string, orgId: string): Promise<CategoryNode[]> {
    const query = `
      SELECT 
        ${CATEGORY_COLUMNS},
        (SELECT COUNT(*) FROM items WHERE category_id = ic.id) as item_count
      FROM item_categories ic
      WHERE parent_id = $1 AND org_id = $2 AND is_active = true
      ORDER BY sort_order, name
    `;

    const result = await pool.query(query, [categoryId, orgId]);
    return result.rows;
  }

  /**
   * Get breadcrumb path from root to category
   */
  async getBreadcrumb(categoryId: string, orgId: string): Promise<CategoryNode[]> {
    const query = `
      WITH RECURSIVE breadcrumb AS (
        SELECT ${CATEGORY_COLUMNS}
        FROM item_categories
        WHERE id = $1 AND org_id = $2
        
        UNION ALL
        
        SELECT
          c.id, c.org_id, c.name, c.code, c.parent_id, c.level, c.path, c.sort_order,
          c.default_hsn, c.default_gst_rate, c.default_uom, c.allow_items,
          c.description, c.is_active, c.created_at, c.updated_at
        FROM item_categories c
        JOIN breadcrumb b ON c.id = b.parent_id
      )
      SELECT * FROM breadcrumb
      ORDER BY level ASC
    `;

    const result = await pool.query(query, [categoryId, orgId]);
    return result.rows;
  }

  /**
   * Get all descendants of a category (including itself)
   */
  async getDescendants(categoryId: string, orgId: string): Promise<CategoryNode[]> {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT ${CATEGORY_COLUMNS}
        FROM item_categories
        WHERE id = $1 AND org_id = $2
        
        UNION ALL
        
        SELECT
          c.id, c.org_id, c.name, c.code, c.parent_id, c.level, c.path, c.sort_order,
          c.default_hsn, c.default_gst_rate, c.default_uom, c.allow_items,
          c.description, c.is_active, c.created_at, c.updated_at
        FROM item_categories c
        JOIN descendants d ON c.parent_id = d.id
      )
      SELECT * FROM descendants
    `;

    const result = await pool.query(query, [categoryId, orgId]);
    return result.rows;
  }

  /**
   * Get count of items in category and all descendants
   */
  async getItemCount(categoryId: string, orgId: string): Promise<number> {
    const descendants = await this.getDescendants(categoryId, orgId);
    const descendantIds = descendants.map(d => d.id);

    if (!descendantIds.length) {
      return 0;
    }

    const query = `
      SELECT COUNT(*) as count
      FROM items
      WHERE org_id = $1 AND category_id = ANY($2)
    `;

    const result = await pool.query(query, [orgId, descendantIds]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get stock value for category and descendants
   */
  async getStockValue(categoryId: string, orgId: string): Promise<number> {
    const descendants = await this.getDescendants(categoryId, orgId);
    const descendantIds = descendants.map(d => d.id);

    if (!descendantIds.length) {
      return 0;
    }

    const query = `
      SELECT COALESCE(SUM(ss.qty_on_hand * ss.avg_cost), 0) as stock_value
      FROM stock_summary ss
      JOIN items i ON ss.item_id = i.id
      WHERE i.org_id = $1 AND i.category_id = ANY($2)
    `;

    const result = await pool.query(query, [orgId, descendantIds]);
    return parseFloat(result.rows[0].stock_value || 0);
  }

  /**
   * Create a new category
   */
  async createCategory(orgId: string, data: CreateCategoryDTO): Promise<CategoryNode> {
    const {
      name,
      code,
      parent_id,
      sort_order,
      default_hsn,
      default_gst_rate,
      default_uom,
      allow_items,
      description,
      is_active,
    } = data;

    if (parent_id) {
      const parentQuery = 'SELECT id FROM item_categories WHERE id = $1 AND org_id = $2';
      const parentResult = await pool.query(parentQuery, [parent_id, orgId]);
      if (!parentResult.rows.length) {
        throw new AppError('Parent category not found', 404);
      }
    }

    const query = `
      INSERT INTO item_categories (
        org_id, name, code, parent_id, sort_order,
        default_hsn, default_gst_rate, default_uom, allow_items,
        description, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${CATEGORY_COLUMNS}
    `;

    const result = await pool.query(query, [
      orgId,
      name,
      code || null,
      parent_id || null,
      sort_order ?? 0,
      default_hsn || null,
      default_gst_rate ?? null,
      default_uom || null,
      allow_items !== undefined ? allow_items : true,
      description || null,
      is_active !== undefined ? is_active : true,
    ]);

    return result.rows[0];
  }

  /**
   * Update category details
   */
  async updateCategory(categoryId: string, orgId: string, data: UpdateCategoryDTO): Promise<CategoryNode> {
    const category = await this.getCategoryById(categoryId, orgId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (data.parent_id && data.parent_id !== category.parent_id) {
      const descendants = await this.getDescendants(categoryId, orgId);
      const descendantIds = descendants.map(d => d.id);
      
      if (descendantIds.includes(data.parent_id)) {
        throw new AppError('Cannot move category under its own descendant', 400);
      }
    }

    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      setClause.push(`code = $${paramCount++}`);
      values.push(data.code || null);
    }
    if (data.parent_id !== undefined) {
      setClause.push(`parent_id = $${paramCount++}`);
      values.push(data.parent_id || null);
    }
    if (data.sort_order !== undefined) {
      setClause.push(`sort_order = $${paramCount++}`);
      values.push(data.sort_order);
    }
    if (data.default_hsn !== undefined) {
      setClause.push(`default_hsn = $${paramCount++}`);
      values.push(data.default_hsn || null);
    }
    if (data.default_gst_rate !== undefined) {
      setClause.push(`default_gst_rate = $${paramCount++}`);
      values.push(data.default_gst_rate);
    }
    if (data.default_uom !== undefined) {
      setClause.push(`default_uom = $${paramCount++}`);
      values.push(data.default_uom || null);
    }
    if (data.allow_items !== undefined) {
      setClause.push(`allow_items = $${paramCount++}`);
      values.push(data.allow_items);
    }
    if (data.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(data.description || null);
    }
    if (data.is_active !== undefined) {
      setClause.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }
    
    if (setClause.length === 0) {
      return category;
    }

    values.push(categoryId);
    values.push(orgId);

    const query = `
      UPDATE item_categories
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND org_id = $${paramCount + 1}
      RETURNING ${CATEGORY_COLUMNS}
    `;

    const result = await pool.query(query, values);
    if (!result.rows.length) {
      throw new AppError('Failed to update category', 500);
    }

    return result.rows[0];
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string, orgId: string): Promise<void> {
    const category = await this.getCategoryById(categoryId, orgId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const childrenQuery = `
      SELECT COUNT(*) as count FROM item_categories 
      WHERE parent_id = $1 AND org_id = $2
    `;
    const childrenResult = await pool.query(childrenQuery, [categoryId, orgId]);
    if (parseInt(childrenResult.rows[0].count, 10) > 0) {
      throw new AppError('Cannot delete category with sub-categories. Move or delete them first.', 400);
    }

    const itemsQuery = `
      SELECT COUNT(*) as count FROM items 
      WHERE category_id = $1 AND org_id = $2
    `;
    const itemsResult = await pool.query(itemsQuery, [categoryId, orgId]);
    if (parseInt(itemsResult.rows[0].count, 10) > 0) {
      throw new AppError('Cannot delete category with items. Move items to another category first.', 400);
    }

    const deleteQuery = `
      DELETE FROM item_categories 
      WHERE id = $1 AND org_id = $2
    `;
    await pool.query(deleteQuery, [categoryId, orgId]);
  }

  /**
   * Get single category by ID
   */
  async getCategoryById(categoryId: string, orgId: string): Promise<CategoryNode | null> {
    const query = `
      SELECT ${CATEGORY_COLUMNS}
      FROM item_categories
      WHERE id = $1 AND org_id = $2
    `;

    const result = await pool.query(query, [categoryId, orgId]);
    return result.rows.length ? result.rows[0] : null;
  }

  /**
   * Move category to new parent
   */
  async moveCategory(categoryId: string, orgId: string, newParentId: string | null): Promise<CategoryNode> {
    const category = await this.getCategoryById(categoryId, orgId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (newParentId) {
      const descendants = await this.getDescendants(categoryId, orgId);
      const descendantIds = descendants.map(d => d.id);
      if (descendantIds.includes(newParentId)) {
        throw new AppError('Cannot move category under its own descendant', 400);
      }
    }

    return this.updateCategory(categoryId, orgId, { parent_id: newParentId });
  }

  /**
   * Helper: Convert flat list to nested tree structure
   */
  private buildNestedTree(rows: CategoryNode[]): CategoryNode[] {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // First pass: create all nodes
    for (const row of rows) {
      const node = { ...row, children: [] };
      map.set(row.id, node);
      if (!row.parent_id) {
        roots.push(node);
      }
    }

    // Second pass: build tree
    for (const row of rows) {
      if (row.parent_id && map.has(row.parent_id)) {
        const parent = map.get(row.parent_id)!;
        const child = map.get(row.id)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(child);
      }
    }

    return roots;
  }
}
