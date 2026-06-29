<?php

declare(strict_types=1);

final class RegulationProposalService
{
    private Database $db;
    private AuditLogger $audit;

    public function __construct(Database $db, AuditLogger $audit)
    {
        $this->db = $db;
        $this->audit = $audit;
    }

    public function approve(string $propostaId, array $body, ?array $user): array
    {
        $proposta = $this->proposal($propostaId);
        if ((string) $proposta['status'] !== 'gerada') {
            throw new RuntimeException('Somente propostas com status gerada podem ser aprovadas.');
        }

        $solicitacoes = $this->proposalRequests($propostaId);
        if (!$solicitacoes) {
            throw new RuntimeException('Proposta sem solicitações vinculadas.');
        }

        $viagemId = $this->newId('via');
        $codigo = 'VG-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $observacoes = trim((string) ($body['observacoes'] ?? 'Criada a partir de proposta de regulação.'));

        $this->db->pdo()->beginTransaction();
        try {
            $this->db->execute(
                "INSERT INTO viagens (
                    id, codigo, origem, destino, motorista_id, veiculo_id, status, prioridade, data_viagem, observacoes, metadados, criado_em, atualizado_em
                ) VALUES (
                    :id, :codigo, :origem, :destino, :motorista_id, :veiculo_id, 'AGENDADA', :prioridade, :data_viagem, :observacoes, :metadados, NOW(), NOW()
                )",
                [
                    'id' => $viagemId,
                    'codigo' => $codigo,
                    'origem' => 'Regulação de Transporte em Saúde',
                    'destino' => (string) $proposta['destino_nome_snapshot'],
                    'motorista_id' => $proposta['motorista_id'] ?? null,
                    'veiculo_id' => $proposta['veiculo_id'] ?? null,
                    'prioridade' => $this->highestPriority($solicitacoes),
                    'data_viagem' => (string) $proposta['data_atendimento'],
                    'observacoes' => $observacoes,
                    'metadados' => $this->json([
                        'origem' => 'proposta_regulacao',
                        'proposta_id' => $propostaId,
                        'assentos_necessarios' => (int) ($proposta['assentos_necessarios'] ?? 0),
                        'requer_acessibilidade' => (int) ($proposta['requer_acessibilidade'] ?? 0) === 1,
                        'alertas' => $this->decodeJson($proposta['alertas'] ?? null),
                    ]),
                ]
            );

            foreach ($solicitacoes as $solicitacao) {
                $passageiroId = $this->newId('pas');
                $this->db->execute(
                    "INSERT INTO passageiros (
                        id, viagem_id, paciente_id, nome, tipo, cpf, telefone, status, metadados, criado_em, atualizado_em
                    ) VALUES (
                        :id, :viagem_id, :paciente_id, :nome, 'paciente', :cpf, :telefone, 'CONFIRMADO', :metadados, NOW(), NOW()
                    )",
                    [
                        'id' => $passageiroId,
                        'viagem_id' => $viagemId,
                        'paciente_id' => $solicitacao['paciente_id'],
                        'nome' => $solicitacao['nome_snapshot'],
                        'cpf' => $solicitacao['documento_snapshot'] ?? null,
                        'telefone' => $solicitacao['telefone_whatsapp'] ?? null,
                        'metadados' => $this->json([
                            'solicitacao_id' => $solicitacao['id'],
                            'quantidade_acompanhantes' => (int) ($solicitacao['quantidade_acompanhantes'] ?? 0),
                            'cadeirante' => (int) ($solicitacao['cadeirante'] ?? 0) === 1,
                            'maca' => (int) ($solicitacao['maca'] ?? 0) === 1,
                            'oxigenio' => (int) ($solicitacao['oxigenio'] ?? 0) === 1,
                            'hemodialise' => (int) ($solicitacao['hemodialise'] ?? 0) === 1,
                            'origem' => $solicitacao['endereco_origem'] ?? null,
                            'horario_consulta' => $solicitacao['horario_consulta'] ?? null,
                        ]),
                    ]
                );

                $this->db->execute(
                    "UPDATE solicitacoes_transporte SET status = 'agendada', atualizado_em = NOW() WHERE id = :id",
                    ['id' => $solicitacao['id']]
                );
            }

            $this->db->execute(
                "UPDATE propostas_viagem SET status = 'aprovada', atualizado_em = NOW() WHERE id = :id",
                ['id' => $propostaId]
            );

            $this->recordEvent('proposal.approved', 'proposta', $propostaId, $user, ['viagem_id' => $viagemId]);
            $this->recordEvent('trip.created_from_proposal', 'viagem', $viagemId, $user, ['proposta_id' => $propostaId, 'codigo' => $codigo]);
            $this->db->pdo()->commit();
        } catch (Throwable $error) {
            if ($this->db->pdo()->inTransaction()) {
                $this->db->pdo()->rollBack();
            }
            throw $error;
        }

        $this->audit->record('aprovacao', 'propostas_viagem', $propostaId, $user, ['viagem_id' => $viagemId]);
        return ['proposta' => $this->proposal($propostaId), 'viagem' => $this->db->fetch('SELECT * FROM viagens WHERE id = :id LIMIT 1', ['id' => $viagemId])];
    }

    public function reject(string $propostaId, array $body, ?array $user): array
    {
        $proposta = $this->proposal($propostaId);
        if ((string) $proposta['status'] !== 'gerada') {
            throw new RuntimeException('Somente propostas com status gerada podem ser rejeitadas.');
        }
        $motivo = trim((string) ($body['motivo'] ?? 'Proposta rejeitada pelo operador.'));
        $solicitacoes = $this->proposalRequests($propostaId);

        $this->db->pdo()->beginTransaction();
        try {
            $this->db->execute(
                "UPDATE propostas_viagem SET status = 'rejeitada', justificativa = CONCAT(COALESCE(justificativa, ''), :motivo), atualizado_em = NOW() WHERE id = :id",
                ['id' => $propostaId, 'motivo' => "\nRejeição: " . $motivo]
            );

            foreach ($solicitacoes as $solicitacao) {
                $this->db->execute(
                    "UPDATE solicitacoes_transporte SET status = 'pendente', atualizado_em = NOW() WHERE id = :id AND status = 'proposta_gerada'",
                    ['id' => $solicitacao['id']]
                );
            }

            $this->recordEvent('proposal.rejected', 'proposta', $propostaId, $user, ['motivo' => $motivo]);
            $this->db->pdo()->commit();
        } catch (Throwable $error) {
            if ($this->db->pdo()->inTransaction()) {
                $this->db->pdo()->rollBack();
            }
            throw $error;
        }

        $this->audit->record('rejeicao', 'propostas_viagem', $propostaId, $user, ['motivo' => $motivo]);
        return ['proposta' => $this->proposal($propostaId), 'solicitacoes_liberadas' => count($solicitacoes)];
    }

    private function proposal(string $id): array
    {
        $row = $this->db->fetch('SELECT * FROM propostas_viagem WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$row) {
            throw new RuntimeException('Proposta de viagem não encontrada.');
        }
        return $row;
    }

    private function proposalRequests(string $id): array
    {
        return $this->db->fetchAll(
            'SELECT s.* FROM proposta_solicitacoes ps INNER JOIN solicitacoes_transporte s ON s.id = ps.solicitacao_id WHERE ps.proposta_id = :id ORDER BY ps.ordem ASC, s.horario_consulta ASC',
            ['id' => $id]
        );
    }

    private function highestPriority(array $solicitacoes): string
    {
        $rank = ['baixa' => 1, 'media' => 2, 'alta' => 3, 'critica' => 4];
        $best = 'media';
        foreach ($solicitacoes as $s) {
            $p = strtolower((string) ($s['prioridade'] ?? 'media'));
            if (($rank[$p] ?? 2) > ($rank[$best] ?? 2)) {
                $best = $p;
            }
        }
        return strtoupper($best);
    }

    private function recordEvent(string $type, string $entityType, string $entityId, ?array $user, array $payload = []): void
    {
        $this->db->execute(
            'INSERT INTO regulacao_eventos (id, event_type, entity_type, entity_id, usuario_id, usuario_nome, perfil, payload, criado_em)
             VALUES (:id, :event_type, :entity_type, :entity_id, :usuario_id, :usuario_nome, :perfil, :payload, NOW())',
            [
                'id' => $this->newId('evt'),
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

    private function decodeJson(mixed $value): array
    {
        if (!is_string($value) || trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function json(array $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function newId(string $prefix): string
    {
        return $prefix . '_' . bin2hex(random_bytes(8));
    }
}
