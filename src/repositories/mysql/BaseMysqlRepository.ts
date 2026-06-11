import { Pool } from 'mysql2/promise';
import { getMysqlPool } from '../../database/mysqlPool.js';

export abstract class BaseMysqlRepository {
  protected pool: Pool;
  protected tableName: string;

  constructor(tableName: string) {
    this.pool = getMysqlPool();
    this.tableName = tableName;
  }

  async findAll(): Promise<any[]> {
    const [rows] = await this.pool.query(`SELECT * FROM \`${this.tableName}\``);
    return rows as any[];
  }

  async findById(id: string): Promise<any | null> {
    const [rows] = await this.pool.query(
      `SELECT * FROM \`${this.tableName}\` WHERE id = ? LIMIT 1`,
      [id]
    );
    const results = rows as any[];
    return results.length > 0 ? results[0] : null;
  }

  async create(data: any): Promise<any> {
    const [result] = await this.pool.query(
      `INSERT INTO \`${this.tableName}\` SET ?`,
      [data]
    );
    return { ...data, id: (result as any).insertId || data.id };
  }

  async update(id: string, data: any): Promise<any> {
    await this.pool.query(
      `UPDATE \`${this.tableName}\` SET ? WHERE id = ?`,
      [data, id]
    );
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const [result] = await this.pool.query(
      `UPDATE \`${this.tableName}\` SET status = 'inativo', updated_at = NOW() WHERE id = ?`,
      [id]
    );
    return (result as any).affectedRows > 0;
  }
}
