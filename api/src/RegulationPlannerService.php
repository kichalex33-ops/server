<?php

declare(strict_types=1);

final class RegulationPlannerService
{
    private Database $db;
    private AuditLogger $audit;

    public function __construct(Database $db, AuditLogger $audit)
    {
        $this->db = $db;
        $this->audit = $audit;
        $this->ensureTables();
    }

    public function listPropostas(array $query = []): array
    {
        $where = ['1=1'];
        $params = [];
        $status = trim((string) ($query['status'] ?? ''));
        if ($status !== '') {
            $where[] = 'p.status = :status';
            $params['status'] = $status;
        }
        $data = trim((string) ($query['data'] ?? $query['data_atendimento'] ?? ''));
        if ($data !== '') {
            $where[] = 'p.data_atendimento = :data_atendimento';
            $params['data_atendimento'] = $data;
        }
        $limit = max(1, min(200, (int) ($query['limit'] ?? 100)));
        $items = $this->db->fetchAll(
            'SELECT p.*,
                    (SELECT COUNT(*) FROM proposta_solicitacoes ps WHERE ps.proposta_id = p.id) AS total_solicitacoes
             FROM propostas_viagem p
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY p.criado_em DESC
             LIMIT ' . $limit,
            $params
        );
        return ['propostas' => $items, 'items' => $items];
    }

    public function findProposta(string $id): array
    {
        $proposta = $this->db->fetch('SELECT * FROM propostas_viagem WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$proposta) {
            throw new RuntimeException('Proposta de viagem não encontrada.');
        }
        $solicitacoes = $this->db->fetchAll(
            'SELECT s.*
             FROM proposta_solicitacoes ps
             INNER JOIN solicitacoes_transporte s ON s.id = ps.solicitacao_id
             WHERE ps.proposta_id = :id
             ORDER BY ps.ordem ASC, s.horario_consulta ASC',
            ['id' => $id]
        );
        return ['proposta' => $proposta, 'solicitacoes' => $solicitacoes];
    }

    public function gerarPropostas(array $body, ?array $user): array
    {
        $data = trim((string) ($body['data'] ?? $body['data_atendimento'] ?? date('Y-m-d')));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
            throw new RuntimeException('data_atendimento inválida.');
        }
        $janela = max(15, min(180, (int) ($body['janela_minutos'] ?? 45)));
        $limite = max(1, min(300, (int) ($body['limit'] ?? 200)));

        $solicitacoes = $this->db->fetchAll(
            "SELECT * FROM solicitacoes_transporte
             WHERE status = 'pendente' AND data_atendimento = :data_atendimento
             ORDER BY destino_id ASC, horario_consulta ASC, criado_em ASC
             LIMIT {$limite}",
            ['data_atendimento' => $data]
        );

        if (!$solicitacoes) {
            return ['propostas' => [], 'geradas' => 0, 'mensagem' => 'Nenhuma solicitação pendente para a data informada.'];
        }

        $grupos = $this->montarGrupos($solicitacoes, $janela);
        $propostas = [];

        $this->db->pdo()->beginTransaction();
        try {
            foreach ($grupos as $grupo) {
                $propostas[] = $this->salvarProposta($grupo, $user, $janela);
            }
            $this->recordEvent('planner.proposals_generated', 'planner', 'batch', $user, ['data_atendimento' => $data, 'total' => count($propostas)]);
            $this->db->pdo()->commit();
        } catch (Throwable $error) {
            if ($this->db->pdo()->inTransaction()) {
                $this->db->pdo()->rollBack();
            }
            throw $error;
        }

        return ['propostas' => $propostas, 'geradas' => count($propostas)];
    }

    private function montarGrupos(array $solicitacoes, int $janela): array
    {
        $grupos = [];
        $usadas = [];
        foreach ($solicitacoes as $base) {
            if (isset($usadas[$base['id']])) {
                continue;
            }
            $grupo = [$base];
            $usadas[$base['id']] = true;

            if ((int) ($base['nao_agrupar'] ?? 0) === 1) {
                $grupos[] = $grupo;
                continue;
            }

            foreach ($solicitacoes as $candidata) {
                if (isset($usadas[$candidata['id']]) || $candidata['id'] === $base['id']) {
                    continue;
                }
                if ($this->podeAgrupar($base, $candidata, $janela)) {
                    $grupo[] = $candidata;
                    $usadas[$candidata['id']] = true;
                }
            }
            $grupos[] = $grupo;
        }
        return $grupos;
    }

    private function podeAgrupar(array $a, array $b, int $janela): bool
    {
        if ((string) $a['destino_id'] !== (string) $b['destino_id']) {
            return false;
        }
        if ((string) $a['data_atendimento'] !== (string) $b['data_atendimento']) {
            return false;
        }
        if (abs($this->timeMinutes((string) $a['horario_consulta']) - $this->timeMinutes((string) $b['horario_consulta'])) > $janela) {
            return false;
        }
        if ((int) ($a['nao_agrupar'] ?? 0) === 1 || (int) ($b['nao_agrupar'] ?? 0) === 1) {
            return false;
        }
        if ($this->hasClinicalBlock($a, $b)) {
            return false;
        }
        return true;
    }

    private function salvarProposta(array $grupo, ?array $user, int $janela): array
    {
        $id = $this->newId('prp');
        $data = (string) $grupo[0]['data_atendimento'];
        $destinoId = (string) $grupo[0]['destino_id'];
        $destinoNome = (string) $grupo[0]['destino_nome_snapshot'];
        $assentos = $this->assentosNecessarios($grupo);
        $requerAcessibilidade = $this->requerAcessibilidade($grupo);
        $veiculo = $this->selecionarVeiculo($assentos, $requerAcessibilidade);
        $motorista = $this->selecionarMotorista();
        $alertas = $this->alertas($grupo, $veiculo, $motorista, $assentos, $requerAcessibilidade);
        $justificativa = $this->justificativa($grupo, $janela, $veiculo, $motorista);

        $this->db->execute(
            "INSERT INTO propostas_viagem (
                id, status, data_atendimento, destino_id, destino_nome_snapshot,
                veiculo_id, veiculo_nome_snapshot, motorista_id, motorista_nome_snapshot,
                assentos_necessarios, capacidade_veiculo, requer_acessibilidade,
                alertas, justificativa, custo_previsto, km_previsto, metadados, criado_por,
                criado_em, atualizado_em
            ) VALUES (
                :id, 'gerada', :data_atendimento, :destino_id, :destino_nome_snapshot,
                :veiculo_id, :veiculo_nome_snapshot, :motorista_id, :motorista_nome_snapshot,
                :assentos_necessarios, :capacidade_veiculo, :requer_acessibilidade,
                :alertas, :justificativa, NULL, NULL, :metadados, :criado_por,
                NOW(), NOW()
            )",
            [
                'id' => $id,
                'data_atendimento' => $data,
                'destino_id' => $destinoId,
                'destino_nome_snapshot' => $destinoNome,
                'veiculo_id' => $veiculo['id'] ?? null,
                'veiculo_nome_snapshot' => $veiculo['nome'] ?? $veiculo['placa'] ?? null,
                'motorista_id' => $motorista['id'] ?? null,
                'motorista_nome_snapshot' => $motorista['nome'] ?? null,
                'assentos_necessarios' => $assentos,
                'capacidade_veiculo' => $veiculo['capacidade'] ?? null,
                'requer_acessibilidade' => $requerAcessibilidade ? 1 : 0,
                'alertas' => $this->json($alertas),
                'justificativa' => $justificativa,
                'metadados' => $this->json(['janela_minutos' => $janela, 'solicitacoes' => array_column($grupo, 'id')]),
                'criado_por' => $user['id'] ?? null,
            ]
        );

        $ordem = 1;
        foreach ($grupo as $solicitacao) {
            $this->db->execute(
                'INSERT INTO proposta_solicitacoes (proposta_id, solicitacao_id, ordem, criado_em) VALUES (:proposta_id, :solicitacao_id, :ordem, NOW())',
                ['proposta_id' => $id, 'solicitacao_id' => $solicitacao['id'], 'ordem' => $ordem]
            );
            $this->db->execute(
                "UPDATE solicitacoes_transporte SET status = 'proposta_gerada', atualizado_em = NOW() WHERE id = :id",
                ['id' => $solicitacao['id']]
            );
            $ordem++;
        }

        $this->recordEvent('planner.proposal_generated', 'proposta', $id, $user, ['solicitacoes' => array_column($grupo, 'id')]);
        $this->audit->record('criacao', 'propostas_viagem', $id, $user, ['total_solicitacoes' => count($grupo)]);
        return $this->findProposta($id)['proposta'];
    }

    private function selecionarVeiculo(int $assentos, bool $requerAcessibilidade): ?array
    {
        $where = ['LOWER(COALESCE(status, "")) NOT IN ("excluido", "manutencao", "inativo")', 'COALESCE(capacidade, 0) >= :capacidade'];
        $params = ['capacidade' => $assentos];
        if ($requerAcessibilidade) {
            $where[] = '(LOWER(COALESCE(tipo, "")) LIKE "%van%" OR LOWER(COALESCE(metadados, "")) LIKE "%acess%" OR LOWER(COALESCE(metadados, "")) LIKE "%cadeir%")';
        }
        return $this->db->fetch('SELECT * FROM veiculos WHERE ' . implode(' AND ', $where) . ' ORDER BY capacidade ASC, criado_em ASC LIMIT 1', $params);
    }

    private function selecionarMotorista(): ?array
    {
        return $this->db->fetch("SELECT * FROM motoristas WHERE LOWER(COALESCE(status, 'ativo')) NOT IN ('excluido','inativo','bloqueado') ORDER BY criado_em ASC LIMIT 1");
    }

    private function assentosNecessarios(array $grupo): int
    {
        $total = 0;
        foreach ($grupo as $s) {
            $total += 1 + max(0, (int) ($s['quantidade_acompanhantes'] ?? 0));
            if ((int) ($s['cadeirante'] ?? 0) === 1 || (int) ($s['maca'] ?? 0) === 1) {
                $total += 1;
            }
        }
        return $total;
    }

    private function requerAcessibilidade(array $grupo): bool
    {
        foreach ($grupo as $s) {
            if ((int) ($s['precisa_veiculo_acessivel'] ?? 0) === 1 || (int) ($s['cadeirante'] ?? 0) === 1 || (int) ($s['maca'] ?? 0) === 1 || (int) ($s['oxigenio'] ?? 0) === 1) {
                return true;
            }
        }
        return false;
    }

    private function hasClinicalBlock(array $a, array $b): bool
    {
        $aInfecto = (int) ($a['infectocontagioso'] ?? 0) === 1;
        $bInfecto = (int) ($b['infectocontagioso'] ?? 0) === 1;
        $aImuno = (int) ($a['oncologia_imunossuprimido'] ?? 0) === 1;
        $bImuno = (int) ($b['oncologia_imunossuprimido'] ?? 0) === 1;
        $aFragil = (int) ($a['idoso_fragil'] ?? 0) === 1;
        $bFragil = (int) ($b['idoso_fragil'] ?? 0) === 1;
        return ($aInfecto && ($bImuno || $bFragil)) || ($bInfecto && ($aImuno || $aFragil));
    }

    private function alertas(array $grupo, ?array $veiculo, ?array $motorista, int $assentos, bool $requerAcessibilidade): array
    {
        $alertas = [];
        if (!$veiculo) {
            $alertas[] = ['nivel' => 'bloqueante', 'mensagem' => 'Nenhum veículo disponível com capacidade suficiente.'];
        }
        if (!$motorista) {
            $alertas[] = ['nivel' => 'bloqueante', 'mensagem' => 'Nenhum motorista disponível encontrado.'];
        }
        if ($requerAcessibilidade) {
            $alertas[] = ['nivel' => 'atencao', 'mensagem' => 'Grupo exige veículo acessível ou equipamento operacional.'];
        }
        foreach ($grupo as $s) {
            if ((int) ($s['hemodialise'] ?? 0) === 1) {
                $alertas[] = ['nivel' => 'atencao', 'mensagem' => 'Há paciente de hemodiálise; priorizar pontualidade e retorno.'];
                break;
            }
        }
        if ($veiculo && (int) ($veiculo['capacidade'] ?? 0) < $assentos) {
            $alertas[] = ['nivel' => 'bloqueante', 'mensagem' => 'Capacidade do veículo insuficiente.'];
        }
        return $alertas;
    }

    private function justificativa(array $grupo, int $janela, ?array $veiculo, ?array $motorista): string
    {
        $destino = (string) $grupo[0]['destino_nome_snapshot'];
        $total = count($grupo);
        $base = "Agrupamento determinístico V1 por destino comum ({$destino}) e janela máxima de {$janela} minutos entre consultas. Total de solicitações agrupadas: {$total}.";
        if ($veiculo) {
            $base .= ' Veículo selecionado por capacidade mínima compatível.';
        }
        if ($motorista) {
            $base .= ' Motorista selecionado entre registros ativos disponíveis.';
        }
        $base .= ' KM e custo previsto permanecem nulos nesta etapa porque ainda não há integração real de mapas/roteamento.';
        return $base;
    }

    private function timeMinutes(string $time): int
    {
        $parts = explode(':', $time);
        return ((int) ($parts[0] ?? 0)) * 60 + ((int) ($parts[1] ?? 0));
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

    private function ensureTables(): void
    {
        $this->db->execute("CREATE TABLE IF NOT EXISTS propostas_viagem (
            id VARCHAR(64) PRIMARY KEY,
            status ENUM('gerada','aprovada','rejeitada','obsoleta','cancelada') NOT NULL DEFAULT 'gerada',
            data_atendimento DATE NOT NULL,
            destino_id VARCHAR(64) NOT NULL,
            destino_nome_snapshot VARCHAR(180) NOT NULL,
            veiculo_id VARCHAR(64) NULL,
            veiculo_nome_snapshot VARCHAR(180) NULL,
            motorista_id VARCHAR(64) NULL,
            motorista_nome_snapshot VARCHAR(180) NULL,
            assentos_necessarios INT NOT NULL DEFAULT 0,
            capacidade_veiculo INT NULL,
            requer_acessibilidade TINYINT(1) NOT NULL DEFAULT 0,
            alertas JSON NULL,
            justificativa TEXT NULL,
            custo_previsto DECIMAL(12,2) NULL,
            km_previsto DECIMAL(12,2) NULL,
            metadados JSON NULL,
            criado_por VARCHAR(64) NULL,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_propostas_status_data (status, data_atendimento),
            INDEX idx_propostas_destino (destino_id),
            INDEX idx_propostas_veiculo (veiculo_id),
            INDEX idx_propostas_motorista (motorista_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->db->execute("CREATE TABLE IF NOT EXISTS proposta_solicitacoes (
            proposta_id VARCHAR(64) NOT NULL,
            solicitacao_id VARCHAR(64) NOT NULL,
            ordem INT NOT NULL DEFAULT 0,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (proposta_id, solicitacao_id),
            INDEX idx_prop_sol_solicitacao (solicitacao_id)
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
}
