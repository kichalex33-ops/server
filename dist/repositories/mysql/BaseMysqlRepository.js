import { getMysqlPool } from '../../database/mysqlPool.js';
export class BaseMysqlRepository {
    pool;
    tableName;
    constructor(tableName) {
        this.pool = getMysqlPool();
        this.tableName = tableName;
    }
    async findAll() {
        const [rows] = await this.pool.query(`SELECT * FROM \`${this.tableName}\``);
        return rows;
    }
    async findById(id) {
        const [rows] = await this.pool.query(`SELECT * FROM \`${this.tableName}\` WHERE id = ? LIMIT 1`, [id]);
        const results = rows;
        return results.length > 0 ? results[0] : null;
    }
    async create(data) {
        const [result] = await this.pool.query(`INSERT INTO \`${this.tableName}\` SET ?`, [data]);
        return { ...data, id: result.insertId || data.id };
    }
    async update(id, data) {
        await this.pool.query(`UPDATE \`${this.tableName}\` SET ? WHERE id = ?`, [data, id]);
        return this.findById(id);
    }
    async softDelete(id) {
        const [result] = await this.pool.query(`UPDATE \`${this.tableName}\` SET status = 'inativo', updated_at = NOW() WHERE id = ?`, [id]);
        return result.affectedRows > 0;
    }
}
