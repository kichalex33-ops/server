# H5.36 — Complementos de backlog

## Decisão de escopo registrada

A confirmação prévia ao paciente por WhatsApp/SMS foi deliberadamente deixada fora da entrega imediata H5.34/H5.35 porque essas versões priorizaram segurança, LGPD, backup, operação interna e correções visuais. A função, porém, não deve desaparecer do produto. Ela entra como item futuro planejado.

---

## H536-001 — Confirmação prévia ao paciente por WhatsApp/SMS

**Prioridade:** Média  
**Área:** Operação / Comunicação / Absenteísmo  
**Status:** Backlog futuro, pós-estabilização H5.34/H5.35  
**Dependências:** LGPD, telefone do paciente, consentimento de comunicação, status da viagem, provedor WhatsApp/SMS.

### Problema

Hoje o sistema acompanha viagem, rota, motorista, paciente e eventos, mas não confirma previamente com o paciente se ele realmente irá ao atendimento. Isso reduz a capacidade de prevenir ausência, remarcação tardia e viagem perdida.

### Objetivo

Permitir que a operação envie uma confirmação antes da viagem e registre a resposta do paciente.

### Escopo mínimo

1. Operador agenda a viagem.
2. Sistema exibe ação **Enviar confirmação ao paciente**.
3. Mensagem pode ser enviada por WhatsApp ou SMS, conforme provedor configurado.
4. Paciente pode responder:
   - confirmado;
   - não poderá ir;
   - solicita remarcação;
   - sem resposta.
5. A viagem ganha status de confirmação separado do status operacional da viagem.
6. Dashboard Gerencial passa a exibir indicador de confirmação e possível absenteísmo evitável.

### Campos mínimos sugeridos

- `viagem_id`
- `paciente_id`
- `canal`: `whatsapp` ou `sms`
- `telefone_destino`
- `status_confirmacao`: `pendente`, `enviada`, `confirmada`, `recusada`, `remarcacao_solicitada`, `sem_resposta`, `falhou`
- `provider_message_id`
- `enviada_em`
- `respondida_em`
- `expira_em`
- `criado_por`

### Critérios de aceite

- O sistema não envia mensagem sem telefone válido.
- O sistema não envia mensagem sem base legal/consentimento registrado ou justificativa operacional documentada.
- A ação de envio fica auditada.
- A resposta fica ligada à viagem e ao paciente.
- O operador consegue filtrar viagens sem confirmação.
- O gestor consegue ver taxa de confirmação e ausência.

### Fora de escopo nesta etapa

- Chat completo com paciente.
- Bot conversacional avançado.
- Remarcação automática sem validação humana.
- Cobrança por mensagem ou gestão financeira do provedor.

---

## GATE-H536-DB — Validação obrigatória de migrations antes de ZIP final

**Prioridade:** Crítica  
**Área:** Banco / Entrega / Segurança operacional  
**Status:** Gate obrigatório para qualquer versão que altere schema.

### Regra

Toda tarefa que criar, alterar, remover ou depender de coluna, tabela, índice ou constraint precisa passar por validação em staging antes de gerar ZIP final para substituição da pasta no HostGator.

### Aplica-se especialmente a

- H534-001 — hash/segurança da credencial do motorista.
- H534-002 — expiração e uso único de código.
- H534-011 — cancelamento de viagem com motivo.
- H534-013 — vencimento de CNH.
- H534-015 — viagem de retorno.
- H534-020 — consolidação de tokens QR.
- Qualquer migration nova `db/migrations/*.sql`.

### Critérios obrigatórios

1. Rodar migrations em banco staging vazio.
2. Rodar migrations em cópia recente do banco atual.
3. Confirmar que a migration é segura contra reexecução ou documentar que é execução única.
4. Confirmar que não há `DROP`, `TRUNCATE` ou limpeza destrutiva fora de arquivos explicitamente marcados como homologação/reset.
5. Testar login, cadastro de motorista, criação de viagem, vínculo de passageiro, LGPD e Segurança depois da migration.
6. Registrar resultado em relatório `Hxxx_AUDITORIA_FINAL.md` antes de compactar o ZIP.

### Bloqueio de release

Se qualquer migration falhar no staging, o ZIP final não deve ser gerado. Corrigir a migration, repetir o teste e só então compactar.
