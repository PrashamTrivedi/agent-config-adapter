/**
 * D1 Database Adapter for Better Auth
 * Implements the adapter interface required by Better Auth for Cloudflare D1
 */

// Define our own types to avoid import issues with better-auth
interface WhereClause {
  field: string;
  value: unknown;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'starts_with' | 'ends_with';
}

type WhereCondition = WhereClause[];

function buildWhereClause(where: WhereCondition): { sql: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];

  for (const condition of where) {
    const { field, value, operator = 'eq' } = condition;
    const columnName = `"${field}"`;

    switch (operator) {
      case 'eq':
        conditions.push(`${columnName} = ?`);
        values.push(value);
        break;
      case 'ne':
        conditions.push(`${columnName} != ?`);
        values.push(value);
        break;
      case 'gt':
        conditions.push(`${columnName} > ?`);
        values.push(value);
        break;
      case 'gte':
        conditions.push(`${columnName} >= ?`);
        values.push(value);
        break;
      case 'lt':
        conditions.push(`${columnName} < ?`);
        values.push(value);
        break;
      case 'lte':
        conditions.push(`${columnName} <= ?`);
        values.push(value);
        break;
      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map(() => '?').join(', ');
          conditions.push(`${columnName} IN (${placeholders})`);
          values.push(...value);
        }
        break;
      case 'contains':
        conditions.push(`${columnName} LIKE ?`);
        values.push(`%${value}%`);
        break;
      case 'starts_with':
        conditions.push(`${columnName} LIKE ?`);
        values.push(`${value}%`);
        break;
      case 'ends_with':
        conditions.push(`${columnName} LIKE ?`);
        values.push(`%${value}`);
        break;
      default:
        conditions.push(`${columnName} = ?`);
        values.push(value);
    }
  }

  return {
    sql: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

function transformRow<T extends Record<string, unknown>>(row: T | null): T | null {
  if (!row) return null;

  const transformed = { ...row } as Record<string, unknown>;

  // Convert boolean integers back to booleans
  if ('emailVerified' in transformed) {
    transformed.emailVerified = transformed.emailVerified === 1;
  }
  if ('is_active' in transformed) {
    transformed.is_active = transformed.is_active === 1;
  }

  // Convert timestamp integers to Date objects for Better Auth
  const dateFields = ['createdAt', 'updatedAt', 'expiresAt', 'accessTokenExpiresAt', 'refreshTokenExpiresAt'];
  for (const field of dateFields) {
    if (field in transformed && typeof transformed[field] === 'number') {
      transformed[field] = new Date(transformed[field] as number);
    }
  }

  return transformed as T;
}

function prepareData(data: Record<string, unknown>): Record<string, unknown> {
  const prepared: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (typeof value === 'boolean') {
      prepared[key] = value ? 1 : 0;
    } else if (value instanceof Date) {
      prepared[key] = value.getTime();
    } else {
      prepared[key] = value;
    }
  }

  return prepared;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function d1Adapter(db: D1Database): any {
  const adapter = {
    id: 'd1',

    async create<T extends Record<string, unknown>>({
      model,
      data,
    }: {
      model: string;
      data: Record<string, unknown>;
    }): Promise<T> {
      const prepared = prepareData(data);
      const columns = Object.keys(prepared);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(prepared);

      const sql = `INSERT INTO "${model}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      await db.prepare(sql).bind(...values).run();

      // Return the created record
      const result = await db
        .prepare(`SELECT * FROM "${model}" WHERE "id" = ?`)
        .bind(data.id)
        .first<T>();

      return transformRow(result) as T;
    },

    async findOne<T extends Record<string, unknown>>({
      model,
      where,
      select,
    }: {
      model: string;
      where: WhereCondition;
      select?: string[];
    }): Promise<T | null> {
      const columns = select ? select.map((c) => `"${c}"`).join(', ') : '*';
      const whereClause = buildWhereClause(where);

      const sql = `SELECT ${columns} FROM "${model}"${whereClause.sql} LIMIT 1`;

      const result = await db.prepare(sql).bind(...whereClause.values).first<T>();

      return transformRow(result);
    },

    async findMany<T extends Record<string, unknown>>({
      model,
      where,
      limit,
      offset,
      sortBy,
    }: {
      model: string;
      where?: WhereCondition;
      limit?: number;
      offset?: number;
      sortBy?: { field: string; direction: 'asc' | 'desc' };
    }): Promise<T[]> {
      let sql = `SELECT * FROM "${model}"`;

      const values: unknown[] = [];

      if (where && where.length > 0) {
        const whereClause = buildWhereClause(where);
        sql += whereClause.sql;
        values.push(...whereClause.values);
      }

      if (sortBy) {
        sql += ` ORDER BY "${sortBy.field}" ${sortBy.direction.toUpperCase()}`;
      }

      if (limit) {
        sql += ` LIMIT ?`;
        values.push(limit);
      }

      if (offset) {
        sql += ` OFFSET ?`;
        values.push(offset);
      }

      const results = await db.prepare(sql).bind(...values).all<T>();

      return (results.results || []).map((row) => transformRow(row) as T);
    },

    async update<T extends Record<string, unknown>>({
      model,
      where,
      update: updateData,
    }: {
      model: string;
      where: WhereCondition;
      update: Record<string, unknown>;
    }): Promise<T | null> {
      const prepared = prepareData(updateData);
      const setClause = Object.keys(prepared)
        .map((c) => `"${c}" = ?`)
        .join(', ');
      const setValues = Object.values(prepared);

      const whereClause = buildWhereClause(where);

      const sql = `UPDATE "${model}" SET ${setClause}${whereClause.sql}`;

      await db.prepare(sql).bind(...setValues, ...whereClause.values).run();

      // Return the updated record
      return this.findOne<T>({ model, where });
    },

    async updateMany({
      model,
      where,
      update: updateData,
    }: {
      model: string;
      where: WhereCondition;
      update: Record<string, unknown>;
    }): Promise<number> {
      const prepared = prepareData(updateData);
      const setClause = Object.keys(prepared)
        .map((c) => `"${c}" = ?`)
        .join(', ');
      const setValues = Object.values(prepared);

      const whereClause = buildWhereClause(where);

      const sql = `UPDATE "${model}" SET ${setClause}${whereClause.sql}`;

      const result = await db.prepare(sql).bind(...setValues, ...whereClause.values).run();

      return result.meta?.changes || 0;
    },

    async delete({
      model,
      where,
    }: {
      model: string;
      where: WhereCondition;
    }): Promise<void> {
      const whereClause = buildWhereClause(where);

      const sql = `DELETE FROM "${model}"${whereClause.sql}`;

      await db.prepare(sql).bind(...whereClause.values).run();
    },

    async deleteMany({
      model,
      where,
    }: {
      model: string;
      where: WhereCondition;
    }): Promise<number> {
      const whereClause = buildWhereClause(where);

      const sql = `DELETE FROM "${model}"${whereClause.sql}`;

      const result = await db.prepare(sql).bind(...whereClause.values).run();

      return result.meta?.changes || 0;
    },

    async count({
      model,
      where,
    }: {
      model: string;
      where?: WhereCondition;
    }): Promise<number> {
      let sql = `SELECT COUNT(*) as count FROM "${model}"`;

      const values: unknown[] = [];

      if (where && where.length > 0) {
        const whereClause = buildWhereClause(where);
        sql += whereClause.sql;
        values.push(...whereClause.values);
      }

      const result = await db.prepare(sql).bind(...values).first<{ count: number }>();

      return result?.count || 0;
    },
  };

  return adapter;
}
