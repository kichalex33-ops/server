<?php

declare(strict_types=1);

final class RegulationService
{
    private Database $db;
    private AuditLogger $audit;

    public function __construct(Database $db, AuditLogger $audit)
    {
        $this->db = $db;
        $this->audit = $audit;
        $this->ensureTables();
    }

    public function listSolicitacoes(array $query = []): array
    {
        $where = ['1=1'];
        $params = [];

        $status = trim((string) ($query['status'] ?? ''));
        if ($status !== '') {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }

        $data = trim((string) ($query['data'] ?? $query['data_atendimento'] ?? ''));
        if ($data !== '') {
            $where[] = 'data_atendimento = :data_atendimento';
            $params['data_atendimento'] = $data;
        }

        $destinoId = trim((string) ($query['destino_id'] ?? $query['destinoId'] ?? ''));
        if ($destinoId !== '') {
            $where[] = 'destino_id = :destino_id';
            $params['destino_id'] = $destinoId;
        }

        $limit = max(1, min(200, (int) ($query['limit'] ?? 100)));
        $sql = 'SELECT * FROM solicitacoes_transporte WHERE ' . implode(' AND ', $where) . ' ORDER BY data_atendimento ASC, horario_consulta ASC, criado_em DESC LIMIT ' . $limit;
        $items = $this->db->fetchAll($sql, $params);

        return ['solicitacoes' => $items, 'items' => $items];
    }

    public function findSolicitacao(string $id): array
    {
        $item = $this->db->fetch('SELECT * FROM solicitacoes_transporte WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$item) {
            throw new RuntimeException('Solicitação de transporte não encontrada.');
        }
        return ['solicitacao' => $item];
    }

    public function createSolicitacao(array $body, ?array $user): array
    {
        $pacienteId = trim((string) ($body['paciente_id'] ?? $body['pacienteId'] ?? ''));
        $destinoId = trim((string) ($body['destino_id'] ?? $body['destinoId'] ?? ''));
        $data = trim((string) ($body['data'] ?? $body['data_atendimento'] ?? ''));
        $horario = trim((string) ($body['horario_consulta'] ?? $body['horario'] ?? ''));
        $origem = trim((string) ($body['endereco_origem'] ?? $body['origem'] ?? ''));

        if ($pacienteId === '') {
            throw new RuntimeException('paciente_id é obrigatório.');
        }
        if ($destinoId === '') {
            throw new RuntimeException('destino_id é obrigatório.');
        }
        if (!$this->validDate($data)) {
            throw new RuntimeException('data_atendimento inválida ou obrigatória.');
        }
        if (!$this->validTime($horario)) {
            throw new RuntimeException('horario_consulta inválido ou obrigatório.');
        }
        if ($origem === '') {
            throw new RuntimeException('endereco_origem é obrigatório.');
        }

        $paciente = $this->patientSnapshot($pacienteId);
        $destino = $this->destinationSnapshot($destinoId);

        $acompanhantes = max(0, (int) ($body['quantidade_acompanhantes'] ?? $body['acompanhantes'] ?? 0));
        $possuiAcompanhante = $this->bool($body['possui_acompanhante'] ?? $body['acompanhante'] ?? ($acompanhantes > 0));
        if ($possuiAcompanhante && $acompanhantes < 1) {
            $acompanhantes = 1;
        }

        $cadeirante = $this->bool($body['cadeirante'] ?? false);
        $maca = $this->bool($body['maca'] ?? false);
        $oxigenio = $this->bool($body['oxigenio'] ?? false);
        $precisaAcessivel = $this->bool($body['precisa_veiculo_acessivel'] ?? ($cadeirante || $maca));

        $id = (string) ($body['id'] ?? $this->newId('sol'));
        $horarioLimite = (string) ($body['horario_limite_chegada'] ?? $this->subtractMinutes($horario, 30));
        $prioridade = $this->enum((string) ($body['prioridade'] ?? 'media'), ['baixa', 'media', 'alta', 'critica'], 'media');
        $origemSolicitacao = $this->enum((string) ($body['origem_da_solicitacao'] ?? 'painel_operador'), ['painel_operador', 'integracao_sus', 'portal_paciente'], 'painel_operador');

        $this->db->pdo()->beginTransaction();
        try {
            $this->db->execute(
                "INSERT INTO solicitacoes_transporte (
                    id, status, paciente_id, nome_snapshot, telefone_whatsapp, documento_snapshot, cns_cartao_sus,
                    data_atendimento, horario_consulta, horario_limite_chegada, destino_id, destino_nome_snapshot, especialidade, prioridade,
                    endereco_origem, bairro, cidade, ponto_referencia, latitude, longitude,
                    possui_acompanhante, acompanhante_obrigatorio, quantidade_acompanhantes,
                    cadeirante, maca, oxigenio, mobilidade_reduzida, idoso_fragil, precisa_veiculo_acessivel,
                    hemodialise, oncologia_imunossuprimido, infectocontagioso, isolamento_recomendado, nao_agrupar,
                    enviar_whatsapp, confirmar_presenca, telefone_confirmado, canal_preferido,
                    criado_por, origem_da_solicitacao, observacoes_operacionais, metadados,
                    criado_em, atualizado_em
                ) VALUES (
                    :id, 'pendente', :paciente_id, :nome_snapshot, :telefone_whatsapp, :documento_snapshot, :cns_cartao_sus,
                    :data_atendimento, :horario_consulta, :horario_limite_chegada, :destino_id, :destino_nome_snapshot, :especialidade, :prioridade,
                    :endereco_origem, :bairro, :cidade, :ponto_referencia, :latitude, :longitude,
                    :possui_acompanhante, :acompanhante_obrigatorio, :quantidade_acompanhantes,
                    :cadeirante, :maca, :oxigenio, :mobilidade_reduzida, :idoso_fragil, :precisa_veiculo_acessivel,
                    :hemodialise, :oncologia_imunossuprimido, :infectocontagioso, :isolamento_recomendado, :nao_agrupar,
                    :enviar_whatsapp, :confirmar_presenca, :telefone_confirmado, :canal_preferido,
                    :criado_por, :origem_da_solicitacao, :observacoes_operacionais, :metadados,
                    NOW(), NOW()
                )",
                [
                    'id' => $id,
                    'paciente_id' => $pacienteId,
                    'nome_snapshot' => $paciente['nome_snapshot'],
                    'telefone_whatsapp' => $body['telefone_whatsapp'] ?? $paciente['telefone_whatsapp'],
                    'documento_snapshot' => $paciente['documento_snapshot'],
                    'cns_cartao_sus' => $body['cns_cartao_sus'] ?? $paciente['cns_cartao_sus'],
                    'data_atendimento' => $data,
                    'horario_consulta' => $horario,
                    'horario_limite_chegada' => $horarioLimite,
                    'destino_id' => $destinoId,
                    'destino_nome_snapshot' => $destino['destino_nome_snapshot'],
                    'especialidade' => $this->nullableString($body['especialidade'] ?? null),
                    'prioridade' => $prioridade,
                    'endereco_origem' => $origem,
                    'bairro' => $this->nullableString($body['bairro'] ?? null),
                    'cidade' => $this->nullableString($body['cidade'] ?? null),
                    'ponto_referencia' => $this->nullableString($body['ponto_referencia'] ?? null),
                    'latitude' => $this->nullableDecimal($body['latitude'] ?? null),
                    'longitude' => $this->nullableDecimal($body['longitude'] ?? null),
                    'possui_acompanhante' => $possuiAcompanhante ? 1 : 0,
                    'acompanhante_obrigatorio' => $this->bool($body['acompanhante_obrigatorio'] ?? false) ? 1 : 0,
                    'quantidade_acompanhantes' => $acompanhantes,
                    'cadeirante' => $cadeirante ? 1 : 0,
                    'maca' => $maca ? 1 : 0,
                    'oxigenio' => $oxigenio ? 1 : 0,
                    'mobilidade_reduzida' => $this->bool($body['mobilidade_reduzida'] ?? false) ? 1 : 0,
                    'idoso_fragil' => $this->bool($body['idoso_fragil'] ?? false) ? 1 : 0,
                    'precisa_veiculo_acessivel' => $precisaAcessivel ? 1 : 0,
                    'hemodialise' => $this->bool($body['hemodialise'] ?? false) ? 1 : 0,
                    'oncologia_imunossuprimido' => $this->bool($body['oncologia_imunossuprimido'] ?? $body['imunossuprimido'] ?? false) ? 1 : 0,
                    'infectocontagioso' => $this->bool($body['infectocontagioso'] ?? false) ? 1 : 0,
                    'isolamento_recomendado' => $this->bool($body['isolamento_recomendado'] ?? false) ? 1 : 0,
                    'nao_agrupar' => $this->bool($body['nao_agrupar'] ?? false) ? 1 : 0,
                    'enviar_whatsapp' => $this->bool($body['enviar_whatsapp'] ?? true) ? 1 : 0,
                    'confirmar_presenca' => $this->bool($body['confirmar_presenca'] ?? true) ? 1 : 0,
                    'telefone_confirmado' => $this->bool($body['telefone_confirmado'] ?? false) ? 1 : 0,
                    'canal_preferido' => (string) ($body['canal_preferido'] ?? 'whatsapp'),
                    'criado_por' => $user['id'] ?? null,
                    'origem_da_solicitacao' => $origemSolicitacao,
                    'observacoes_operacionais' => $this->nullableString($body['observacoes_operacionais'] ?? $body['observacoes'] ?? null),
                    'metadados' => $this->json([
                        'paciente_snapshot' => $paciente,
                        'destino_snapshot' => $destino,
                        'entrada' => $body,
                    ]),
                ]
            );

            $this->recordRegulationEvent('solicitacao.created', 'solicitacao', $id, $user, ['solicitacao_id' => $id]);
            $this->db->pdo()->commit();
        } catch (Throwable $error) {
            if ($this->db->pdo()->inTransaction()) {
                $this->db->pdo()->rollBack();
            }
            throw $error;
        }

        $this->audit->record('criacao', 'solicitacoes_transporte', $id, $user);
        return $this->findSolicitacao($id);
    }

    public function cancelSolicitacao(string $id, array $body, ?array $user): array
    {
        $current = $this->db->fetch('SELECT * FROM solicitacoes_transporte WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$current) {
            throw new RuntimeException('Solicitação de transporte não encontrada.');
        }
        if (in_array((string) $current['status'], ['agendada', 'cancelada'], true)) {
            throw new RuntimeException('Solicitação não pode ser cancelada neste status.');
        }

        $this->db->pdo()->beginTransaction();
        try {
            $this->db->execute(
                "UPDATE solicitacoes_transporte
                 SET status = 'cancelada', observacoes_operacionais = COALESCE(:motivo, observacoes_operacionais), atualizado_em = NOW()
                 WHERE id = :id",
                ['id' => $id, 'motivo' => $this->nullableString($body['motivo'] ?? null)]
            );
            $this->recordRegulationEvent('solicitacao.cancelled', 'solicitacao', $id, $user, ['motivo' => $body['motivo'] ?? null]);
            $this->db->pdo()->commit();
        } catch (Throwable $error) {
            if ($this->db->pdo()->inTransaction()) {
                $this->db->pdo()->rollBack();
            }
            throw $error;
        }

        $this->audit->record('cancelamento', 'solicitacoes_transporte', $id, $user, ['motivo' => $body['motivo'] ?? null]);
        return $this->findSolicitacao($id);
    }

    public function listRegulationEvents(array $query = []): array
    {
        $limit = max(1, min(200, (int) ($query['limit'] ?? 100)));
        $items = $this->db->fetchAll('SELECT * FROM regulacao_eventos ORDER BY criado_em DESC LIMIT ' . $limit);
        return ['eventos' => $items, 'items' => $items];
    }

    private function patientSnapshot(string $id): array
    {
        $row = $this->db->fetch('SELECT * FROM pacientes WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$row) {
            throw new RuntimeException('Paciente não encontrado.');
        }
        return [
            'paciente_id' => $id,
            'nome_snapshot' => (string) ($row['nome'] ?? $row['nome_completo'] ?? $row['name'] ?? $id),
            'telefone_whatsapp' => (string) ($row['telefone'] ?? $row['whatsapp'] ?? $row['celular'] ?? ''),
            'documento_snapshot' => (string) ($row['cpf'] ?? $row['documento'] ?? ''),
            'cns_cartao_sus' => (string) ($row['cns'] ?? $row['cartao_sus'] ?? $row['sus'] ?? ''),
        ];
    }

    private function destinationSnapshot(string $id): array
    {
        $row = $this->db->fetch('SELECT * FROM destinos WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$row) {
            throw new RuntimeException('Destino não encontrado.');
        }
        return [
            'destino_id' => $id,
            'destino_nome_snapshot' => (string) ($row['nome'] ?? $row['descricao'] ?? $row['destino'] ?? $id),
        ];
    }

    private function recordRegulationEvent(string $type, string $entityType, string $entityId, ?array $user, array $payload = []): void
    {
        $eventId = $this->newId('evt');
        $this->db->execute(
            'INSERT INTO regulacao_eventos (id, event_type, entity_type, entity_id, usuario_id, usuario_nome, perfil, payload, criado_em)
             VALUES (:id, :event_type, :entity_type, :entity_id, :usuario_id, :usuario_nome, :perfil, :payload, NOW())',
            [
                'id' => $eventId,
                'event_type' => $type,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'usuario_id' => $user['id'] ?? null,
                'usuario_nome' => $user['nome'] ?? $user['login'] ?? null,
                'perfil' => $user['perfil'] ?? null,
                'payload' => $this->json($payload),
            ]
        );
    }

    private function ensureTables(): void
    {
        $this->db->execute("CREATE TABLE IF NOT EXISTS solicitacoes_transporte (
            id VARCHAR(64) PRIMARY KEY,
            status ENUM('pendente','em_planejamento','proposta_gerada','agendada','cancelada') NOT NULL DEFAULT 'pendente',
            paciente_id VARCHAR(64) NOT NULL,
            nome_snapshot VARCHAR(180) NOT NULL,
            telefone_whatsapp VARCHAR(40) NULL,
            documento_snapshot VARCHAR(40) NULL,
            cns_cartao_sus VARCHAR(40) NULL,
            data_atendimento DATE NOT NULL,
            horario_consulta TIME NOT NULL,
            horario_limite_chegada TIME NULL,
            destino_id VARCHAR(64) NOT NULL,
            destino_nome_snapshot VARCHAR(180) NOT NULL,
            especialidade VARCHAR(120) NULL,
            prioridade ENUM('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
            endereco_origem TEXT NOT NULL,
            bairro VARCHAR(120) NULL,
            cidade VARCHAR(120) NULL,
            ponto_referencia TEXT NULL,
            latitude DECIMAL(10,8) NULL,
            longitude DECIMAL(11,8) NULL,
            possui_acompanhante TINYINT(1) NOT NULL DEFAULT 0,
            acompanhante_obrigatorio TINYINT(1) NOT NULL DEFAULT 0,
            quantidade_acompanhantes INT NOT NULL DEFAULT 0,
            cadeirante TINYINT(1) NOT NULL DEFAULT 0,
            maca TINYINT(1) NOT NULL DEFAULT 0,
            oxigenio TINYINT(1) NOT NULL DEFAULT 0,
            mobilidade_reduzida TINYINT(1) NOT NULL DEFAULT 0,
            idoso_fragil TINYINT(1) NOT NULL DEFAULT 0,
            precisa_veiculo_acessivel TINYINT(1) NOT NULL DEFAULT 0,
            hemodialise TINYINT(1) NOT NULL DEFAULT 0,
            oncologia_imunossuprimido TINYINT(1) NOT NULL DEFAULT 0,
            infectocontagioso TINYINT(1) NOT NULL DEFAULT 0,
            isolamento_recomendado TINYINT(1) NOT NULL DEFAULT 0,
            nao_agrupar TINYINT(1) NOT NULL DEFAULT 0,
            enviar_whatsapp TINYINT(1) NOT NULL DEFAULT 1,
            confirmar_presenca TINYINT(1) NOT NULL DEFAULT 1,
            telefone_confirmado TINYINT(1) NOT NULL DEFAULT 0,
            canal_preferido VARCHAR(40) NOT NULL DEFAULT 'whatsapp',
            criado_por VARCHAR(64) NULL,
            origem_da_solicitacao ENUM('painel_operador','integracao_sus','portal_paciente') NOT NULL DEFAULT 'painel_operador',
            observacoes_operacionais TEXT NULL,
            metadados JSON NULL,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_solicitacoes_status_data (status, data_atendimento, horario_consulta),
            INDEX idx_solicitacoes_paciente (paciente_id),
            INDEX idx_solicitacoes_destino (destino_id),
            INDEX idx_solicitacoes_criado_por (criado_por)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->db->execute("CREATE TABLE IF NOT EXISTS regulacao_eventos (
            id VARCHAR(64) PRIMARY KEY,
            event_type VARCHAR(100) NOT NULL,
            entity_type VARCHAR(60) NOT NULL,
            entity_id VARCHAR(64) NOT NULL,
            usuario_id VARCHAR(64) NULL,
            usuario_nome VARCHAR(180) NULL,
            perfil VARCHAR(40) NULL,
            payload JSON NULL,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reg_event_type (event_type),
            INDEX idx_reg_entity (entity_type, entity_id),
            INDEX idx_reg_criado_em (criado_em)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    private function newId(string $prefix): string
    {
        return $prefix . '_' . bin2hex(random_bytes(8));
    }

    private function json(array $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function bool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int) $value === 1;
        }
        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'sim', 'yes', 'on'], true);
    }

    private function validDate(string $value): bool
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1;
    }

    private function validTime(string $value): bool
    {
        return preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $value) === 1;
    }

    private function subtractMinutes(string $time, int $minutes): string
    {
        $parts = explode(':', $time);
        $hour = (int) ($parts[0] ?? 0);
        $minute = (int) ($parts[1] ?? 0);
        $total = max(0, ($hour * 60 + $minute) - $minutes);
        return sprintf('%02d:%02d:00', intdiv($total, 60), $total % 60);
    }

    private function enum(string $value, array $allowed, string $default): string
    {
        $value = strtolower(trim($value));
        return in_array($value, $allowed, true) ? $value : $default;
    }

    private function nullableString(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : $value;
    }

    private function nullableDecimal(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw new RuntimeException('Coordenada inválida.');
        }
        return (string) $value;
    }
}
