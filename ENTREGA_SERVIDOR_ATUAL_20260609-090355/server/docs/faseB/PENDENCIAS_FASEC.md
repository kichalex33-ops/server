# Pendencias para Fase C

## Leitura real de QR

- Implementar leitura por camera usando API nativa do navegador ou biblioteca local.
- Validar compatibilidade com Android Chrome.
- Manter alternativa manual para suporte.

## Seguranca

- Definir token operacional por dispositivo pareado.
- Implementar revogacao de dispositivo no Painel Operador.
- Exigir HTTPS em producao.
- Avaliar criptografia local para configuracoes sensiveis.

## Sincronizacao

- Adicionar `client_event_id` em todos os eventos.
- Implementar idempotencia no backend.
- Implementar backoff progressivo.
- Criar painel de pendencias por dispositivo.

## Operacao

- Melhorar fluxo visual de viagem.
- Adicionar anexos/fotos quando o navegador permitir.
- Criar historico local por viagem.
- Mostrar mensagens reais da central por motorista.

## GPS

- Testar consumo de bateria.
- Definir politica para tela bloqueada.
- Avaliar Web Background Sync quando suportado.

## Instalacao

- Criar icones PNG em tamanhos 192 e 512.
- Revisar manifest com screenshots e categorias.
- Testar instalacao em Android real.
