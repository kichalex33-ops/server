# Painel Logistico Node

Plataforma local de testes do Painel Logistico com Node.js, Express, JavaScript, HTML/CSS/JS e persistencia local em JSON.

A interface visual foi reaproveitada da pagina ja aprovada, preservando identidade Andrade Gestao em Saude, mapa, cards, viagem ativa, passageiros, eventos, mensagens, alertas, checklist, relatorios e fallback demonstrativo.

## Requisitos

- Node.js 18 ou superior.
- npm.

## Instalar

```bash
npm install
```

## Configurar

Copie `.env.example` para `.env` quando precisar personalizar ambiente local.

```env
PORT=3000
NODE_ENV=production
API_TOKEN=
CORS_ORIGIN=
APP_URL=
PUBLIC_URL=
BACKUP_DIR=data/backups
LOG_LEVEL=info
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

Nao versionar `.env` real.

## Iniciar

```bash
npm start
```

Modo desenvolvimento:

```bash
npm run dev
```

## Acessar

No proprio notebook:

```text
http://localhost:3000
```

Sala de situacao:

```text
http://localhost:3000/painel-logistico/sala-situacao
```

Portal de acesso:

```text
http://localhost:3000/painel-logistico
```

Credenciais locais de teste:

```text
GESTAO / GSTteste 01
OPERADOR / OPteste 01
```

Na rede Wi-Fi:

```text
http://10.0.0.4:3000
```

Descobrir IP no Linux:

```bash
hostname -I
ip addr
```

## Configurar app motorista

No mesmo Wi-Fi:

```text
BASE_URL=http://10.0.0.4:3000
```

Fora da rede local, por 3G/4G, usar futuramente um endereco HTTPS publicado por Cloudflare Tunnel ou solucao equivalente.

## Testes

```bash
npm test
```

Teste rapido da API:

```bash
curl http://localhost:3000/api/status
```

## Persistencia

Arquivo local:

```text
data/painel-logistico.json
```

Backups simples:

```text
data/backups/
```

Backup manual:

```bash
npm run backup -- antes-atualizacao
```

## Documentacao

- `docs/fase1/`: auditoria e arquitetura.
- `docs/fase2/`: implementacao Node, API real, JSON, testes e rede.
- `docs/fase3/`: nucleo operacional de viagens, passageiros, ocorrencias, despesas, sync e timeline.
- `docs/fase4/`: GPS real, sala de situacao, mapa operacional, alertas e trajetos.
- `docs/fase5/`: painel gestor, auditoria, custos, relatorios e exportacoes CSV.
- `docs/fase51/`: dashboards avancados, KPIs, graficos, rankings e pendencias da proxima fase.
- `docs/fase7/`: piloto real, app motorista Flutter, contratos de comunicacao e homologacao.
- `docs/fase8/`: seguranca operacional avancada, emergencias, LGPD, auditoria e mensageria.
- `docs/fase9/`: preparacao para producao, VPS, dominio, HTTPS, PM2, backup, rollback e operacao assistida.
- `docs/fase10/`: escalabilidade 2.0, banco relacional futuro, API v2, BI, WebSocket futuro, planejador por regras e Ollama opcional.

## Nucleo operacional

A Fase 3 adiciona endpoints para preparacao, saida, espera, retorno, finalizacao, cancelamento, embarque, desembarque, ausencia, ocorrencias, despesas, timeline e sincronizacao offline-first.

## Sala de situacao e GPS

A Fase 4 adiciona:

- `POST /api/gps`: recebe GPS real, valida coordenadas e viagem existente, salva historico e registra evento/sync.
- `GET /api/live-map`: entrega frota ativa, ultima posicao, alertas, feed e indicadores para o mapa.
- `GET /api/viagens/:id/trajeto`: retorna o historico de pontos da viagem.
- `/painel-logistico/sala-situacao`: tela operacional com Leaflet/OpenStreetMap, polling de 5 segundos e alternancia real/demo.

## Painel Gestao

A Fase 5 adiciona:

- `/painel-logistico`: tela principal com acesso separado para Operador Logistico e Gestor.
- `/painel-logistico/operador`: painel operacional claro, baseado na referencia visual enviada.
- `/painel-logistico/gestao`: painel gerencial separado.
- `GET /api/gestao/dashboard`
- `GET /api/gestao/frota`
- `GET /api/gestao/motoristas`
- `GET /api/gestao/passageiros`
- `GET /api/gestao/custos`
- `GET /api/gestao/auditoria`
- `GET /api/export/csv`

## Dashboards avancados

A Fase 5.1 adiciona KPIs executivos, rankings e graficos Chart.js nos paineis Operador e Gestor.

Camada unica de graficos:

```text
public/assets/js/charts/dashboard-charts.js
```

Novos endpoints:

- `GET /api/indicadores/operador`
- `GET /api/indicadores/gestor`
- `GET /api/graficos/viagens`
- `GET /api/graficos/custos`
- `GET /api/graficos/frota`
- `GET /api/graficos/ocorrencias`

## App motorista e piloto real

A Fase 7 conecta a plataforma ao app Flutter localizado em:

```text
C:\dev\plataforma\app\plataforma teste
```

Contratos principais:

- `POST /api/driver/login`
- `GET /api/driver/trips?motorista_id=mot-001`
- `GET /api/driver/notices`
- `POST /api/driver/trips/:id/checklist`
- `POST /api/driver/trips/:id/km-inicial`
- `POST /api/driver/trips/:id/flow`
- `POST /api/driver/trips/:id/finalizar`
- `POST /api/driver/panic`
- `POST /api/driver/proofs`

## Seguranca operacional e emergencias

A Fase 8 adiciona:

- `/painel-logistico/emergencias`: Central de Emergencia.
- `POST /api/panico`
- `GET /api/emergencias`
- `POST /api/emergencias/:id/atender`
- `POST /api/emergencias/:id/finalizar`
- `POST /api/giroflex/iniciar`
- `POST /api/giroflex/finalizar`
- `GET /api/watchdog`
- `GET /api/antifraude`
- `GET /api/mensagens`
- `POST /api/mensagens`
- `GET /api/auditoria`
- `GET /api/lgpd`

Estruturas preparadas sem integracao externa real:

- `insurance_events`
- `assistance_events`

## Producao e operacao assistida

A Fase 9 adiciona:

- `/painel-logistico/admin/infra`: monitoramento de infraestrutura.
- `GET /api/infra/status`
- `GET /api/infra/backups`
- `POST /api/infra/backup`
- `POST /api/infra/restore`
- `GET /api/infra/resources`

Documentacao operacional principal:

- `docs/fase9/AMBIENTE_PRODUCAO.md`
- `docs/fase9/PM2.md`
- `docs/fase9/NGINX.md`
- `docs/fase9/HTTPS_SSL.md`
- `docs/fase9/DOMINIO.md`
- `docs/fase9/BACKUP_PRODUCAO.md`
- `docs/fase9/ROLLBACK.md`
- `docs/fase9/CHECKLIST_PRODUCAO.md`

## Versao 2.0 e escalabilidade

A Fase 10 nao migra banco, nao implementa WebSocket real e nao ativa IA por padrao. Ela prepara:

- PostgreSQL como banco preferencial futuro.
- API v2 planejada sem quebrar API atual.
- BI e analytics futuros.
- App supervisor futuro.
- Planejador operacional por regras locais.
- Ollama opcional com `qwen2.5:0.5b`, desligado por padrao.
