# Multimunicipio

## Objetivo futuro

Permitir multiplos municipios com dados e permissoes isolados.

## Entidades afetadas

- Municipio.
- Usuarios por municipio.
- Veiculos por municipio.
- Motoristas por municipio.
- Pacientes por municipio.
- Viagens por municipio.
- Relatorios por municipio.
- Backup por municipio.
- Identidade visual por municipio.

## Decisao

Nao implementar multi-tenant agora. Para a versao 2.0, adicionar `municipio_id` nas entidades e politicas de acesso por perfil.
