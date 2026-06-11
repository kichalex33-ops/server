import { BaseMysqlRepository } from './BaseMysqlRepository.js';
export class ViagemMysqlRepository extends BaseMysqlRepository {
    constructor() {
        super('viagens');
    }
    async addItem(collection, item) {
        return this.create(item);
    }
    async updateItem(collection, id, patch) {
        return this.update(id, patch);
    }
    getCollection(collection) {
        return this.findAll();
    }
    // Implementação específica para buscar passageiros da viagem
    async findPassageiros(viagemId) {
        const [rows] = await this.pool.query('SELECT * FROM passageiros WHERE viagem_id = ?', [viagemId]);
        return rows;
    }
}
