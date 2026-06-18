<?php

declare(strict_types=1);

final class ApiService
{
    private Database $db;
    private array $config;
    private AuditLogger $audit;

    public function __construct(Database $db, array $config, AuditLogger $audit)
    {
        $this->db = $db;
        $this->config = $config;
        $this->audit = $audit;
    }

    public function status(): array
    {
        $db = $this->db->fetch('SELECT 1 AS ok');
        return [
            'ok' => true,
            'status' => 'online',
            'runtime' => 'php',
            'mysql' => (bool) ($db['ok'] ?? false),
            'timestamp' => date('c'),
        ];
    }

    public function systemHealth(): array
    {
        return [
            'status' => 'ok',
            'db_driver' => 'mysql',
            'database' => 'connected',
            'runtime' => PHP_VERSION,
            'timestamp' => date('c'),
        ];
    }

    public function dashboardSummary(): array
    {
        return [
            'viagensHoje' => $this->scalar("SELECT COUNT(*) FROM viagens WHERE data_viagem = CURDATE()"),
            'viagensEmAndamento' => $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')"),
            'motoristasAtivos' => $this->scalar("SELECT COUNT(*) FROM motoristas WHERE status IN ('ativo','online','em_operacao')"),
            'ultimaLocalizacao' => $this->db->fetch('SELECT * FROM localizacoes ORDER BY criado_em DESC LIMIT 1'),
            'viagem_ativa' => $this->db->fetch("SELECT * FROM viagens WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA') ORDER BY criado_em DESC LIMIT 1"),
        ];
    }

    public function listMotoristas(): array
    {
        return ['motoristas' => $this->db->fetchAll('SELECT * FROM motoristas ORDER BY criado_em DESC')];
    }

    public function createMotorista(array $body, ?array $user = null): array
    {
        $id = $this->newId('mot');
        $nome = trim((string) ($body['nome'] ?? ''));
        if ($nome === '') {
            throw new RuntimeException('Nome do motorista e obrigatorio.');
        }
        $senha = (string) ($body['senha'] ?? $body['password'] ?? '');
        $this->db->execute(
            'INSERT INTO motoristas (id, nome, cpf, matricula, telefone, email, senha_hash, status, metadados, criado_em, atualizado_em) VALUES (:id, :nome, :cpf, :matricula, :telefone, :email, :senha_hash, :status, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'nome' => $nome,
                'cpf' => $this->nullable($body, 'cpf'),
                'matricula' => $this->nullable($body, 'matricula'),
                'telefone' => $this->nullable($body, 'telefone'),
                'email' => $this->nullable($body, 'email'),
                'senha_hash' => $senha !== '' ? password_hash($senha, PASSWORD_DEFAULT) : null,
                'status' => $body['status'] ?? 'ativo',
                'metadados' => $this->json($body),
            ]
        );
        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id', ['id' => $id]);
        $this->audit->record('criacao', 'motoristas', $id, $user);
        return ['motorista' => $driver];
    }

    public function driverQr(string $id, array $body, ?array $user = null): array
    {
        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$driver) {
            throw new RuntimeException('Motorista nao encontrado.');
        }
        $token = bin2hex(random_bytes(24));
        $expires = date('Y-m-d H:i:s', time() + 600);
        $this->db->execute(
            'INSERT INTO motorista_qr_tokens (id, motorista_id, token_hash, origem, ip, expira_em, criado_em) VALUES (:id, :motorista_id, :token_hash, :origem, :ip, :expira_em, NOW())',
            [
                'id' => $this->newId('qr'),
                'motorista_id' => $id,
                'token_hash' => hash('sha256', $token),
                'origem' => $body['origem'] ?? 'painel_operador',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'expira_em' => $expires,
            ]
        );
        $payload = [
            'tipo' => 'MOTORISTA_QR_LOGIN',
            'versao' => 1,
            'motorista_id' => $id,
            'token' => $token,
            'endpoint' => '/api/driver/qr-login',
            'expira_em' => date('c', strtotime($expires)),
        ];
        if ($this->config['base_url'] !== '') {
            $payload['server_url'] = $this->config['base_url'];
        }
        $this->audit->record('alteracao_critica', 'motoristas', $id, $user, ['acao' => 'gerar_qrcode']);
        return [
            'motorista' => $driver,
            'qr' => [
                'texto' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'payload' => $payload,
                'expira_em' => $payload['expira_em'],
            ],
        ];
    }

    public function driverQrLogin(array $body): array
    {
        $token = (string) ($body['token'] ?? '');
        $motoristaId = (string) ($body['motorista_id'] ?? $body['motoristaId'] ?? '');
        if ($token === '' || $motoristaId === '') {
            throw new RuntimeException('QR Code invalido.');
        }
        $row = $this->db->fetch(
            'SELECT qt.*, m.nome, m.matricula, m.cpf, m.status FROM motorista_qr_tokens qt INNER JOIN motoristas m ON m.id = qt.motorista_id WHERE qt.motorista_id = :motorista_id AND qt.token_hash = :token_hash AND qt.usado_em IS NULL AND qt.expira_em > NOW() LIMIT 1',
            ['motorista_id' => $motoristaId, 'token_hash' => hash('sha256', $token)]
        );
        if (!$row) {
            $this->audit->failure('auth_qr_failed', 'motoristas', $motoristaId);
            throw new RuntimeException('QR Code expirado ou invalido.');
        }
        $this->db->execute('UPDATE motorista_qr_tokens SET usado_em = NOW() WHERE id = :id', ['id' => $row['id']]);
        $motorista = $this->driverUser($row);
        $sessionToken = $this->driverSessionToken($motorista);
        $this->audit->record('login', 'motoristas', $motoristaId, $motorista, ['origem' => 'qr_code']);
        return ['motorista' => $motorista, 'usuario' => $motorista, 'sessao' => ['token' => $sessionToken, 'tipo' => 'Bearer', 'expira_em' => date('c', time() + 86400)]];
    }

    public function driverLogin(array $body): array
    {
        $identificador = trim((string) ($body['identificador'] ?? $body['login'] ?? $body['cpf'] ?? ''));
        $senha = (string) ($body['senha'] ?? $body['password'] ?? '');
        if ($identificador === '' || $senha === '') {
            throw new RuntimeException('Identificador e senha sao obrigatorios.');
        }
        $driver = $this->db->fetch(
            'SELECT * FROM motoristas WHERE id = :id OR cpf = :id OR matricula = :id OR email = :id LIMIT 1',
            ['id' => $identificador]
        );
        if (!$driver || empty($driver['senha_hash']) || !password_verify($senha, (string) $driver['senha_hash'])) {
            $this->audit->failure('driver_login_failed', 'motoristas', $identificador);
            throw new RuntimeException('Credenciais invalidas.');
        }
        $user = $this->driverUser($driver);
        $token = $this->driverSessionToken($user);
        $this->audit->record('login', 'motoristas', (string) $driver['id'], $user);
        return ['token' => $token, 'motorista' => $user, 'usuario' => $user, 'sessao' => ['token' => $token, 'tipo' => 'Bearer']];
    }

    public function driverTrips(?string $motoristaId = null): array
    {
        $params = [];
        $where = '';
        if ($motoristaId !== null && trim($motoristaId) !== '') {
            $where = ' WHERE motorista_id = :motorista_id';
            $params['motorista_id'] = $motoristaId;
        }
        $trips = $this->db->fetchAll('SELECT * FROM viagens' . $where . ' ORDER BY data_viagem DESC, criado_em DESC', $params);
        return ['trips' => $trips, 'viagens' => $trips, 'items' => $trips];
    }

    public function activeDriverTrip(?string $motoristaId = null): array
    {
        $params = [];
        $where = " WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')";
        if ($motoristaId !== null && trim($motoristaId) !== '') {
            $where .= ' AND motorista_id = :motorista_id';
            $params['motorista_id'] = $motoristaId;
        }
        $trip = $this->db->fetch('SELECT * FROM viagens' . $where . ' ORDER BY data_viagem ASC, criado_em DESC LIMIT 1', $params);
        return $trip ?: [];
    }

    public function driverNotices(?string $motoristaId = null): array
    {
        $params = [];
        $where = '';
        if ($motoristaId !== null && trim($motoristaId) !== '') {
            $where = ' WHERE motorista_id IS NULL OR motorista_id = :motorista_id';
            $params['motorista_id'] = $motoristaId;
        }
        $items = $this->db->fetchAll('SELECT * FROM avisos' . $where . ' ORDER BY criado_em DESC LIMIT 100', $params);
        return ['avisos' => $items, 'items' => $items];
    }

    public function listByTrip(string $table, string $tripId): array
    {
        $key = $this->responseKey($table);
        $items = $this->db->fetchAll("SELECT * FROM {$table} WHERE viagem_id = :viagem_id ORDER BY criado_em DESC", ['viagem_id' => $tripId]);
        return [$key => $items, 'items' => $items];
    }

    public function findById(string $table, string $id): array
    {
        $this->assertTable($table);
        $row = $this->db->fetch("SELECT * FROM {$table} WHERE id = :id LIMIT 1", ['id' => $id]);
        return $row ?: [];
    }

    public function addGps(array $body): array
    {
        $viagemId = (string) ($body['viagem_id'] ?? $body['viagemId'] ?? '');
        if ($viagemId === '') {
            throw new RuntimeException('viagem_id e obrigatorio.');
        }
        $trip = $this->db->fetch('SELECT * FROM viagens WHERE id = :id LIMIT 1', ['id' => $viagemId]);
        if (!$trip) {
            throw new RuntimeException('Viagem nao encontrada.');
        }
        $location = $this->createLocation($body + ['viagem_id' => $viagemId]);
        $status = (string) ($body['status_viagem'] ?? $body['status'] ?? $trip['status'] ?? 'AGUARDANDO');
        $this->db->execute('UPDATE viagens SET status = :status, atualizado_em = NOW() WHERE id = :id', ['status' => $this->normalizeStatus($status), 'id' => $viagemId]);
        if ((float) ($location['velocidade'] ?? 0) > 80) {
            $this->createAlert(['viagem_id' => $viagemId, 'tipo' => 'VELOCIDADE_ACIMA_LIMITE', 'descricao' => 'Velocidade acima do limite', 'status' => 'aberto']);
        }
        return ['gps' => $location, 'localizacao' => $location];
    }

    public function liveMap(): array
    {
        $trips = $this->db->fetchAll("SELECT * FROM viagens WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA') ORDER BY criado_em DESC");
        $vehicles = [];
        foreach ($trips as $trip) {
            $latest = $this->db->fetch('SELECT * FROM localizacoes WHERE viagem_id = :viagem_id ORDER BY criado_em DESC LIMIT 1', ['viagem_id' => $trip['id']]);
            $vehicles[] = [
                'id' => $trip['id'],
                'viagem_id' => $trip['id'],
                'motorista_id' => $trip['motorista_id'] ?? null,
                'veiculo_id' => $trip['veiculo_id'] ?? null,
                'status' => $trip['status'],
                'latitude' => $latest['latitude'] ?? null,
                'longitude' => $latest['longitude'] ?? null,
                'velocidade' => $latest['velocidade'] ?? null,
                'ultima_localizacao' => $latest,
            ];
        }
        return ['atualizado_em' => date('c'), 'veiculos' => $vehicles, 'indicadores' => ['viagensAtivas' => count($vehicles)]];
    }

    public function dashboard(): array
    {
        return [
            'viagensPeriodo' => $this->scalar('SELECT COUNT(*) FROM viagens'),
            'pacientesTransportados' => $this->scalar("SELECT COUNT(*) FROM passageiros WHERE UPPER(status) IN ('EMBARCADO','DESEMBARCADO','CONCLUIDO')"),
            'taxaOcupacao' => 0,
            'absenteismo' => $this->scalar("SELECT COUNT(*) FROM passageiros WHERE UPPER(status) IN ('AUSENTE','DESISTIU')"),
            'alertasVelocidade' => $this->scalar("SELECT COUNT(*) FROM alertas WHERE tipo IN ('VELOCIDADE','VELOCIDADE_ACIMA_LIMITE')"),
            'ocorrencias' => $this->scalar('SELECT COUNT(*) FROM ocorrencias'),
            'veiculosAtivos' => $this->scalar("SELECT COUNT(*) FROM veiculos WHERE status IN ('ativo','operacional','online')"),
            'motoristasAtivos' => $this->scalar("SELECT COUNT(*) FROM motoristas WHERE status IN ('ativo','online','em_operacao')"),
        ];
    }

    public function operatorIndicators(): array
    {
        return [
            'kpis' => ['viagensAtivas' => $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')")],
            'feed' => ['ultimosEventos' => $this->db->fetchAll('SELECT tipo, descricao, data_hora AS dataHora FROM eventos ORDER BY data_hora DESC LIMIT 5')],
        ];
    }

    public function managementFleet(): array
    {
        $ranking = $this->db->fetchAll('SELECT id, COALESCE(prefixo, placa, id) AS prefixo, placa, COALESCE(km_rodados, 0) AS kmRodados FROM veiculos ORDER BY km_rodados DESC, prefixo ASC LIMIT 10');
        return ['ranking' => $ranking];
    }

    public function managementDrivers(): array
    {
        $ranking = $this->db->fetchAll('SELECT m.id, m.nome, COUNT(v.id) AS viagens FROM motoristas m LEFT JOIN viagens v ON v.motorista_id = m.id GROUP BY m.id, m.nome ORDER BY viagens DESC, m.nome ASC LIMIT 10');
        return ['motoristas' => $this->listMotoristas()['motoristas'], 'ranking' => $ranking];
    }

    public function managementPassengers(): array
    {
        return [
            'passageirosPrevistos' => $this->scalar('SELECT COUNT(*) FROM passageiros'),
            'pacientesTransportados' => $this->scalar("SELECT COUNT(*) FROM passageiros WHERE UPPER(tipo) = 'PACIENTE' AND UPPER(status) IN ('EMBARCADO','DESEMBARCADO','CONCLUIDO')"),
            'acompanhantesTransportados' => $this->scalar("SELECT COUNT(*) FROM passageiros WHERE UPPER(tipo) = 'ACOMPANHANTE' AND UPPER(status) IN ('EMBARCADO','DESEMBARCADO','CONCLUIDO')"),
            'pacientesAusentes' => $this->scalar("SELECT COUNT(*) FROM passageiros WHERE UPPER(status) IN ('AUSENTE','DESISTIU')"),
            'taxaComparecimento' => 0,
        ];
    }

    public function managementCosts(): array
    {
        $total = (float) $this->scalar('SELECT COALESCE(SUM(valor), 0) FROM despesas');
        return ['total' => $total, 'custoPorKm' => 0, 'custoPorPaciente' => 0, 'combustivel' => $total];
    }

    public function audit(): array
    {
        return ['itens' => $this->db->fetchAll('SELECT rota AS origem, acao AS tipo, entidade_id AS viagem_id, entidade AS descricao, criado_em AS dataHora FROM audit_logs ORDER BY criado_em DESC LIMIT 50')];
    }

    public function lgpdReport(): array
    {
        return [
            'consentimentos' => $this->db->fetchAll('SELECT * FROM lgpd_consents ORDER BY registrado_em DESC LIMIT 100'),
            'solicitacoes' => $this->db->fetchAll('SELECT * FROM data_privacy_requests ORDER BY criado_em DESC LIMIT 100'),
            'acessosDadosPessoais' => $this->db->fetchAll('SELECT * FROM data_access_logs ORDER BY criado_em DESC LIMIT 100'),
        ];
    }

    public function registerConsent(array $body, ?array $user = null): array
    {
        $titularTipo = trim((string) ($body['titular_tipo'] ?? $body['titularTipo'] ?? ''));
        $titularId = trim((string) ($body['titular_id'] ?? $body['titularId'] ?? ''));
        $finalidade = trim((string) ($body['finalidade'] ?? ''));
        if ($titularTipo === '' || $titularId === '' || $finalidade === '') {
            throw new RuntimeException('Titular e finalidade sao obrigatorios.');
        }
        $this->db->execute(
            'INSERT INTO lgpd_consents (titular_tipo, titular_id, finalidade, consentido, ip, user_agent, registrado_em) VALUES (:titular_tipo, :titular_id, :finalidade, :consentido, :ip, :user_agent, NOW())',
            [
                'titular_tipo' => $titularTipo,
                'titular_id' => $titularId,
                'finalidade' => $finalidade,
                'consentido' => !empty($body['consentido']) ? 1 : 0,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            ]
        );
        $this->audit->record('alteracao_critica', 'lgpd_consents', $titularTipo . ':' . $titularId, $user);
        return ['consentimento' => true];
    }

    public function requestAnonymization(array $body, ?array $user = null): array
    {
        $titularTipo = trim((string) ($body['titular_tipo'] ?? $body['titularTipo'] ?? ''));
        $titularId = trim((string) ($body['titular_id'] ?? $body['titularId'] ?? ''));
        if ($titularTipo === '' || $titularId === '') {
            throw new RuntimeException('Titular obrigatorio.');
        }
        $this->db->execute(
            'INSERT INTO data_privacy_requests (titular_tipo, titular_id, tipo, status, solicitado_por, criado_em, atualizado_em) VALUES (:titular_tipo, :titular_id, :tipo, :status, :solicitado_por, NOW(), NOW())',
            [
                'titular_tipo' => $titularTipo,
                'titular_id' => $titularId,
                'tipo' => $body['tipo'] ?? 'anonimizacao',
                'status' => 'pendente',
                'solicitado_por' => $user['id'] ?? null,
            ]
        );
        $this->audit->record('alteracao_critica', 'data_privacy_requests', $titularTipo . ':' . $titularId, $user);
        return ['solicitacao' => true];
    }

    public function chart(string $name): array
    {
        if ($name === 'viagens') {
            return [
                ['id' => 'status-viagens', 'labels' => ['Ativas', 'Finalizadas', 'Canceladas'], 'values' => [
                    $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')"),
                    $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(status) IN ('CONCLUIDA','FINALIZADA')"),
                    $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(status) = 'CANCELADA'"),
                ]],
                ['id' => 'movimentacao-hora', 'labels' => ['00h', '06h', '12h', '18h'], 'values' => [0, 0, 0, 0]],
                ['id' => 'viagens-mes', 'labels' => ['Atual'], 'values' => [$this->scalar('SELECT COUNT(*) FROM viagens')]],
            ];
        }
        if ($name === 'custos') {
            return [['id' => 'custos-categoria', 'labels' => ['Despesas'], 'values' => [(float) $this->scalar('SELECT COALESCE(SUM(valor), 0) FROM despesas')]]];
        }
        if ($name === 'frota') {
            $rows = $this->managementFleet()['ranking'];
            return [['id' => 'veiculos-mais-utilizados', 'labels' => array_column($rows, 'prefixo'), 'values' => array_map('intval', array_column($rows, 'kmRodados'))]];
        }
        if ($name === 'ocorrencias') {
            return [
                ['id' => 'ocorrencias-tipo', 'labels' => ['Ocorrencias'], 'values' => [$this->scalar('SELECT COUNT(*) FROM ocorrencias')]],
                ['id' => 'absenteismo', 'labels' => ['Atual'], 'values' => [$this->scalar("SELECT COUNT(*) FROM passageiros WHERE UPPER(status) IN ('AUSENTE','DESISTIU')")]],
            ];
        }
        return [];
    }

    public function export(string $type): array
    {
        $map = [
            'viagens' => 'SELECT * FROM viagens ORDER BY criado_em DESC',
            'despesas' => 'SELECT * FROM despesas ORDER BY criado_em DESC',
            'passageiros' => 'SELECT * FROM passageiros ORDER BY criado_em DESC',
            'eventos' => 'SELECT * FROM eventos ORDER BY data_hora DESC',
        ];
        return $this->db->fetchAll($map[$type] ?? $map['eventos']);
    }

    public function genericList(string $table): array
    {
        $this->assertTable($table);
        if (in_array($table, ['pacientes', 'passageiros', 'motoristas'], true)) {
            $this->db->execute(
                'INSERT INTO data_access_logs (usuario_id, perfil, entidade, entidade_id, finalidade, ip, rota, criado_em) VALUES (NULL, NULL, :entidade, NULL, :finalidade, :ip, :rota, NOW())',
                [
                    'entidade' => $table,
                    'finalidade' => 'consulta_api',
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'rota' => $_SERVER['REQUEST_URI'] ?? null,
                ]
            );
        }
        $items = $this->db->fetchAll("SELECT * FROM {$table} ORDER BY criado_em DESC LIMIT 200");
        return [$this->responseKey($table) => $items, 'items' => $items];
    }

    public function genericCreate(string $table, array $body, ?array $user = null): array
    {
        $this->assertTable($table);
        if ($table === 'veiculos') {
            return ['veiculo' => $this->createVehicle($body, $user)];
        }
        if ($table === 'pacientes') {
            return ['paciente' => $this->createPatient($body, $user)];
        }
        if ($table === 'viagens') {
            return ['viagem' => $this->createTrip($body, $user)];
        }
        if ($table === 'localizacoes') {
            return ['localizacao' => $this->createLocation($body, $user)];
        }
        if ($table === 'eventos') {
            return ['evento' => $this->createEvent($body, $user)];
        }
        if ($table === 'alertas') {
            return ['alerta' => $this->createAlert($body, $user)];
        }
        if ($table === 'despesas') {
            return ['despesa' => $this->createExpense($body, $user)];
        }
        if ($table === 'ocorrencias') {
            return ['ocorrencia' => $this->createOccurrence($body, $user)];
        }
        if ($table === 'mensagens') {
            return ['mensagem' => $this->createMessage($body, $user)];
        }
        if ($table === 'checklists') {
            return ['checklist' => $this->createChecklist($body, $user)];
        }
        $id = $this->newId(substr($table, 0, 3));
        $this->db->execute(
            "INSERT INTO {$table} (id, metadados, criado_em, atualizado_em) VALUES (:id, :metadados, NOW(), NOW())",
            ['id' => $id, 'metadados' => $this->json($body)]
        );
        $this->audit->record('criacao', $table, $id, $user);
        return [$this->responseKey($table) => $this->db->fetch("SELECT * FROM {$table} WHERE id = :id", ['id' => $id])];
    }

    public function driverChecklist(string $tripId, array $body): array
    {
        $body['viagem_id'] = $tripId;
        $checklist = $this->createChecklist($body);
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'CHECKLIST', 'descricao' => 'Checklist pre-viagem recebido']);
        return ['checklist' => $checklist];
    }

    public function driverInitialKm(string $tripId, array $body): array
    {
        $this->db->execute('UPDATE viagens SET km_saida = :km_saida, status = :status, atualizado_em = NOW() WHERE id = :id', [
            'km_saida' => $body['km_saida'] ?? 0,
            'status' => 'PREPARACAO',
            'id' => $tripId,
        ]);
        if (isset($body['latitude'], $body['longitude'])) {
            $this->createLocation($body + ['viagem_id' => $tripId]);
        }
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'KM_INICIAL', 'descricao' => 'KM inicial registrado']);
        return ['viagem' => $this->findTrip($tripId)];
    }

    public function driverFlow(string $tripId, array $body): array
    {
        $status = $this->statusFromAction((string) ($body['action'] ?? $body['acao'] ?? $body['status'] ?? ''));
        $this->db->execute('UPDATE viagens SET status = :status, atualizado_em = NOW() WHERE id = :id', ['status' => $status, 'id' => $tripId]);
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'VIAGEM_STATUS', 'descricao' => 'Status alterado para ' . $status]);
        return ['viagem' => $this->findTrip($tripId)];
    }

    public function driverFinalizeTrip(string $tripId, array $body): array
    {
        $this->db->execute('UPDATE viagens SET km_retorno = :km_retorno, hora_retorno = NOW(), status = :status, observacoes = COALESCE(:observacoes, observacoes), atualizado_em = NOW() WHERE id = :id', [
            'km_retorno' => $body['km_final'] ?? $body['km_retorno'] ?? null,
            'status' => 'CONCLUIDA',
            'observacoes' => $body['resumo'] ?? null,
            'id' => $tripId,
        ]);
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'VIAGEM_FINALIZADA', 'descricao' => 'Viagem finalizada pelo app motorista']);
        return ['viagem' => $this->findTrip($tripId)];
    }

    public function driverPanic(array $body): array
    {
        $alert = $this->createAlert($body + ['tipo' => 'PANICO', 'status' => 'aberto', 'descricao' => 'Panico acionado pelo motorista']);
        $this->createEvent($body + ['tipo' => 'PANICO', 'descricao' => 'Panico acionado pelo motorista']);
        if (isset($body['latitude'], $body['longitude'])) {
            $this->createLocation($body);
        }
        return ['alerta' => $alert];
    }

    public function driverProof(array $body): array
    {
        $id = $this->newId('cmp');
        $this->db->execute(
            'INSERT INTO comprovantes (id, viagem_id, passageiro_id, tipo, arquivo_nome, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :passageiro_id, :tipo, :arquivo_nome, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? null,
                'passageiro_id' => $body['passageiro_id'] ?? null,
                'tipo' => $body['tipo'] ?? 'foto',
                'arquivo_nome' => $body['arquivo_nome'] ?? null,
                'metadados' => $this->json($body),
            ]
        );
        $proof = $this->db->fetch('SELECT * FROM comprovantes WHERE id = :id', ['id' => $id]);
        $this->audit->record('criacao', 'comprovantes', $id, null);
        return ['comprovante' => $proof];
    }

    public function driverTripStatus(array $body): array
    {
        $tripId = (string) ($body['viagem_id'] ?? $body['viagemId'] ?? $body['id'] ?? '');
        if ($tripId === '') {
            throw new RuntimeException('viagem_id e obrigatorio.');
        }
        $status = $this->normalizeStatus((string) ($body['status'] ?? 'PENDENTE_SINCRONIZACAO'));
        $this->db->execute('UPDATE viagens SET status = :status, atualizado_em = NOW() WHERE id = :id', ['status' => $status, 'id' => $tripId]);
        $event = $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'DRIVER_TRIP_STATUS', 'descricao' => 'Status recebido do app', 'metadados' => $this->json($body)]);
        return ['syncLog' => $event, 'viagem' => $this->findTrip($tripId)];
    }

    public function driverSync(array $body): array
    {
        $event = $this->createEvent([
            'viagem_id' => $body['entity_id'] ?? $body['viagem_id'] ?? null,
            'tipo' => 'DRIVER_SYNC',
            'descricao' => 'Sincronizacao offline recebida do app motorista',
            'payload' => $body,
        ]);
        return ['syncLog' => $event];
    }

    public function driverChangePassword(?string $authorization, array $body): array
    {
        $token = '';
        if ($authorization && substr($authorization, 0, 7) === 'Bearer ') {
            $token = substr($authorization, 7);
        }
        $session = $this->driverFromSessionToken($token);
        $driverId = (string) ($session['sub'] ?? '');
        if ($driverId === '') {
            throw new RuntimeException('Sessao do motorista invalida.');
        }
        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id LIMIT 1', ['id' => $driverId]);
        if (!$driver) {
            throw new RuntimeException('Motorista nao encontrado.');
        }
        $current = (string) ($body['senha_atual'] ?? $body['senhaAtual'] ?? '');
        $next = (string) ($body['nova_senha'] ?? $body['novaSenha'] ?? '');
        if ($next === '') {
            throw new RuntimeException('Nova senha obrigatoria.');
        }
        if (!empty($driver['senha_hash']) && !password_verify($current, (string) $driver['senha_hash'])) {
            throw new RuntimeException('Senha atual invalida.');
        }
        $this->db->execute('UPDATE motoristas SET senha_hash = :senha_hash, atualizado_em = NOW() WHERE id = :id', [
            'senha_hash' => password_hash($next, PASSWORD_DEFAULT),
            'id' => $driverId,
        ]);
        $this->audit->record('alteracao_critica', 'motoristas', $driverId, $this->driverUser($driver), ['acao' => 'alterar_senha']);
        return ['senhaAlterada' => true];
    }

    public function listTripStatuses(): array
    {
        $items = $this->db->fetchAll('SELECT id, status, motorista_id, atualizado_em FROM viagens ORDER BY atualizado_em DESC');
        return ['viagens' => $items, 'items' => $items];
    }

    private function createVehicle(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('vei'));
        $this->db->execute(
            'INSERT INTO veiculos (id, tipo, nome, prefixo, placa, capacidade, status, km_rodados, metadados, criado_em, atualizado_em) VALUES (:id, :tipo, :nome, :prefixo, :placa, :capacidade, :status, :km_rodados, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'tipo' => $body['tipo'] ?? null,
                'nome' => $body['nome'] ?? $body['modelo'] ?? null,
                'prefixo' => $body['prefixo'] ?? null,
                'placa' => $body['placa'] ?? null,
                'capacidade' => $body['capacidade'] ?? null,
                'status' => $body['status'] ?? 'operacional',
                'km_rodados' => $body['km_rodados'] ?? $body['kmRodados'] ?? 0,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'veiculos', $id, $user);
        return $this->db->fetch('SELECT * FROM veiculos WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createPatient(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('pac'));
        $this->db->execute(
            'INSERT INTO pacientes (id, nome, tipo, cpf, telefone, metadados, criado_em, atualizado_em) VALUES (:id, :nome, :tipo, :cpf, :telefone, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'nome' => $body['nome'] ?? null,
                'tipo' => $body['tipo'] ?? 'paciente',
                'cpf' => $body['cpf'] ?? null,
                'telefone' => $body['telefone'] ?? null,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'pacientes', $id, $user);
        return $this->db->fetch('SELECT * FROM pacientes WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createTrip(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $body['codigo'] ?? $this->newId('via'));
        $this->db->execute(
            'INSERT INTO viagens (id, codigo, origem, destino, motorista_id, veiculo_id, status, prioridade, data_viagem, km_saida, km_retorno, hora_saida, hora_retorno, observacoes, metadados, criado_em, atualizado_em) VALUES (:id, :codigo, :origem, :destino, :motorista_id, :veiculo_id, :status, :prioridade, :data_viagem, :km_saida, :km_retorno, :hora_saida, :hora_retorno, :observacoes, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'codigo' => $body['codigo'] ?? $id,
                'origem' => $body['origem'] ?? null,
                'destino' => $body['destino'] ?? null,
                'motorista_id' => $body['motorista_id'] ?? $body['motoristaId'] ?? null,
                'veiculo_id' => $body['veiculo_id'] ?? $body['veiculoId'] ?? null,
                'status' => $this->normalizeStatus((string) ($body['status'] ?? 'AGUARDANDO')),
                'prioridade' => $body['prioridade'] ?? null,
                'data_viagem' => $body['data_viagem'] ?? $body['dataViagem'] ?? null,
                'km_saida' => $body['km_saida'] ?? null,
                'km_retorno' => $body['km_retorno'] ?? null,
                'hora_saida' => $body['hora_saida'] ?? null,
                'hora_retorno' => $body['hora_retorno'] ?? null,
                'observacoes' => $body['observacoes'] ?? null,
                'metadados' => $this->json($body),
            ]
        );
        $this->createEvent(['viagem_id' => $id, 'tipo' => 'VIAGEM_CRIADA', 'descricao' => 'Viagem criada']);
        $this->audit->record('criacao', 'viagens', $id, $user);
        return $this->findTrip($id) ?: [];
    }

    private function createLocation(array $body, ?array $user = null): array
    {
        $latitude = $body['latitude'] ?? null;
        $longitude = $body['longitude'] ?? null;
        if ($latitude === null || $longitude === null) {
            throw new RuntimeException('Latitude e longitude sao obrigatorias.');
        }
        $id = (string) ($body['id'] ?? $this->newId('loc'));
        $this->db->execute(
            'INSERT INTO localizacoes (id, viagem_id, veiculo_id, motorista_id, latitude, longitude, velocidade, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :veiculo_id, :motorista_id, :latitude, :longitude, :velocidade, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'veiculo_id' => $body['veiculo_id'] ?? $body['veiculoId'] ?? null,
                'motorista_id' => $body['motorista_id'] ?? $body['motoristaId'] ?? null,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'velocidade' => $body['velocidade'] ?? 0,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'localizacoes', $id, $user);
        return $this->db->fetch('SELECT * FROM localizacoes WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createEvent(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('evt'));
        $this->db->execute(
            'INSERT INTO eventos (id, viagem_id, tipo, descricao, data_hora, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :tipo, :descricao, NOW(), :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'tipo' => $body['tipo'] ?? 'EVENTO',
                'descricao' => $body['descricao'] ?? $body['mensagem'] ?? null,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'eventos', $id, $user);
        return $this->db->fetch('SELECT * FROM eventos WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createAlert(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('ale'));
        $this->db->execute(
            'INSERT INTO alertas (id, tipo, descricao, status, metadados, criado_em, atualizado_em) VALUES (:id, :tipo, :descricao, :status, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'tipo' => $body['tipo'] ?? 'ALERTA',
                'descricao' => $body['descricao'] ?? null,
                'status' => $body['status'] ?? 'aberto',
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'alertas', $id, $user);
        return $this->db->fetch('SELECT * FROM alertas WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createExpense(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('des'));
        $this->db->execute(
            'INSERT INTO despesas (id, viagem_id, tipo, descricao, valor, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :tipo, :descricao, :valor, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'tipo' => $body['tipo'] ?? null,
                'descricao' => $body['descricao'] ?? null,
                'valor' => $body['valor'] ?? 0,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'despesas', $id, $user);
        return $this->db->fetch('SELECT * FROM despesas WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createOccurrence(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('oco'));
        $this->db->execute(
            'INSERT INTO ocorrencias (id, viagem_id, tipo, descricao, status, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :tipo, :descricao, :status, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'tipo' => $body['tipo'] ?? 'OCORRENCIA',
                'descricao' => $body['descricao'] ?? null,
                'status' => $body['status'] ?? 'aberta',
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'ocorrencias', $id, $user);
        return $this->db->fetch('SELECT * FROM ocorrencias WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createMessage(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('msg'));
        $this->db->execute(
            'INSERT INTO mensagens (id, viagem_id, origem, mensagem, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :origem, :mensagem, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'origem' => $body['origem'] ?? null,
                'mensagem' => $body['mensagem'] ?? $body['descricao'] ?? null,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'mensagens', $id, $user);
        return $this->db->fetch('SELECT * FROM mensagens WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createChecklist(array $body, ?array $user = null): array
    {
        $id = (string) ($body['id'] ?? $this->newId('chk'));
        $this->db->execute(
            'INSERT INTO checklists (id, viagem_id, motorista_id, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :motorista_id, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'motorista_id' => $body['motorista_id'] ?? $body['motoristaId'] ?? null,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'checklists', $id, $user);
        return $this->db->fetch('SELECT * FROM checklists WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function findTrip(string $id): ?array
    {
        return $this->db->fetch('SELECT * FROM viagens WHERE id = :id LIMIT 1', ['id' => $id]);
    }

    private function driverSessionToken(array $driver): string
    {
        return base64_encode(json_encode(['sub' => $driver['id'], 'perfil' => 'MOTORISTA', 'iat' => time()]));
    }

    private function driverFromSessionToken(string $token): array
    {
        if ($token === '') {
            return [];
        }
        $decoded = base64_decode($token, true);
        if ($decoded === false) {
            return [];
        }
        $json = json_decode($decoded, true);
        return is_array($json) ? $json : [];
    }

    private function driverUser(array $driver): array
    {
        return [
            'id' => (string) $driver['id'],
            'nome' => (string) ($driver['nome'] ?? ''),
            'login' => (string) ($driver['matricula'] ?: ($driver['cpf'] ?: $driver['id'])),
            'perfil' => 'MOTORISTA',
            'funcao' => 'Motorista',
            'status' => (string) ($driver['status'] ?? 'ativo'),
            'permissoes' => ['viagens' => true],
            'modulos_permitidos' => ['logistica'],
        ];
    }

    private function statusFromAction(string $action): string
    {
        $key = strtolower(trim($action));
        $map = [
            'aceitar' => 'PREPARACAO',
            'iniciar' => 'EM_TRANSITO_IDA',
            'iniciar_viagem' => 'EM_TRANSITO_IDA',
            'chegada' => 'CHEGADA_EMBARQUE',
            'embarque' => 'PASSAGEIRO_EMBARCADO',
            'espera' => 'EM_ESPERA',
            'retorno' => 'EM_TRANSITO_VOLTA',
            'desembarque' => 'PASSAGEIRO_DESEMBARCADO',
            'finalizar' => 'CONCLUIDA',
            'cancelar' => 'CANCELADA',
        ];
        return $map[$key] ?? $this->normalizeStatus($action ?: 'EM_TRANSITO_IDA');
    }

    private function normalizeStatus(string $status): string
    {
        $plain = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $status);
        return strtoupper(trim((string) $plain));
    }

    private function responseKey(string $table): string
    {
        $map = ['localizacoes' => 'localizacoes', 'eventos' => 'eventos'];
        return $map[$table] ?? $table;
    }

    private function assertTable(string $table): void
    {
        $allowed = ['viagens', 'veiculos', 'pacientes', 'passageiros', 'despesas', 'ocorrencias', 'alertas', 'mensagens', 'checklists', 'eventos', 'localizacoes', 'avisos', 'comprovantes'];
        if (!in_array($table, $allowed, true)) {
            throw new RuntimeException('Colecao invalida.');
        }
    }

    private function scalar(string $sql)
    {
        $row = $this->db->fetch('SELECT (' . $sql . ') AS valor');
        return $row ? $row['valor'] + 0 : 0;
    }

    private function nullable(array $body, string $key): ?string
    {
        $value = trim((string) ($body[$key] ?? ''));
        return $value === '' ? null : $value;
    }

    private function json(array $body): string
    {
        return json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function newId(string $prefix): string
    {
        return $prefix . '-' . bin2hex(random_bytes(6));
    }
}
