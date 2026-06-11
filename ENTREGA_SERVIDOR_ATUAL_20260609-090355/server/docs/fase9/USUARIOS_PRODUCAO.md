# Usuarios de Producao

## Perfis previstos

- SUPER_ADMIN: configuracao e infraestrutura.
- ADMIN: gestao operacional completa.
- GESTOR: indicadores, custos, auditoria e relatorios.
- OPERADOR: viagens, mapa, alertas e emergencias.
- MOTORISTA: app, viagens atribuidas, GPS, eventos e panico.

## Regra atual

Nesta fase nao foi criado provedor de identidade novo. A separacao visual e operacional existente permanece, e a protecao de escrita continua por `API_TOKEN` quando configurado.

## Recomendacao antes do piloto

- Definir responsaveis reais.
- Remover senhas compartilhadas.
- Configurar `API_TOKEN` forte no `.env`.
- Registrar troca de usuario em auditoria quando login real for implementado.
