# Configuração do DB_DRIVER

O sistema agora suporta dois modos de operação, configuráveis via arquivo `.env`.

## 1. Modo JSON (Local/Desktop)
Ideal para desenvolvimento offline ou servidores sem MySQL.
```env
DB_DRIVER=json
```
- **Persistência:** `data/painel-logistico.json`
- **Comportamento:** Funciona exatamente como a versão anterior.

## 2. Modo MySQL (Produção/HostGator)
Ideal para o ambiente final ou servidores robustos.
```env
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=seu_banco
DB_USER=seu_usuario
DB_PASS=sua_senha
```
- **Persistência:** Tabelas MySQL (InnoDB).
- **Comportamento:** Utiliza conexões assíncronas via Pool.

---
*Nota: Se a conexão MySQL falhar em tempo de execução, o sistema registrará um erro no log e o endpoint de health check indicará `unavailable`.*
