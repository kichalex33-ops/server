# Padrão Repository Factory

A arquitetura foi alterada para desacoplar a lógica de negócio (Services) da forma como os dados são salvos (Repositories).

## Estrutura de Pastas
- `src/repositories/repositoryFactory.ts`: O ponto de decisão central.
- `src/repositories/jsonRepository.ts`: Implementação legada.
- `src/repositories/mysql/*.ts`: Implementações relacionais.

## Como funciona no Código
Ao invés de importar um repositório fixo, os serviços recebem o `factory`:

```typescript
// Exemplo em logisticService.ts
export function createLogisticService(factory) {
  const motoristaRepo = factory.motoristas;
  // O motoristaRepo pode ser tanto JSON quanto MySQL
  const list = await motoristaRepo.findAll();
}
```

## Benefícios
1. **Zero Downtime Local:** Podemos continuar desenvolvendo localmente com JSON.
2. **Transição Suave:** Módulos complexos (como GPS) podem continuar em JSON enquanto os cadastros base migram para MySQL.
3. **Testabilidade:** Fácil criação de Mocks para testes unitários.
