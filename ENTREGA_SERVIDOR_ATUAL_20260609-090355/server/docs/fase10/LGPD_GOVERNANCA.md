# LGPD e Governanca de Dados

## Dados tratados

- Pacientes e acompanhantes.
- Motoristas.
- Usuarios.
- Localizacao GPS.
- Historico de viagens.
- Logs e auditoria.
- Ocorrencias e emergencias.

## Dados sensiveis

Transporte sanitario pode envolver informacoes de saude, mobilidade, agenda medica e localizacao. O acesso deve ser restrito.

## Politicas minimas

- Usar HTTPS em producao.
- Configurar `API_TOKEN`.
- Restringir CORS.
- Evitar CPF completo em logs.
- Definir retencao municipal.
- Manter backup protegido.
- Registrar auditoria de acoes criticas.

## Responsabilidade

O municipio operador deve definir base legal, usuarios autorizados, prazos de retencao e procedimento de exclusao.
