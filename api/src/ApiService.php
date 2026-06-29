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
        $serverUrl = $this->publicServerUrl();
        return [
            'ok' => true,
            'status' => 'online',
            'app' => 'AGSAP Homologacao',
            'ambiente' => $this->config['app_env'] ?? 'production',
            'runtime' => 'php',
            'mysql' => (bool) ($db['ok'] ?? false),
            'server_url' => $serverUrl,
            'api_base_url' => $serverUrl,
            'activation_endpoint' => '/api/driver/activate',
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

    public function watchdog(): array
    {
        return [
            'status' => 'ok',
            'alertas' => $this->db->fetchAll(
                "SELECT tipo, descricao, status, criado_em FROM alertas WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO') ORDER BY criado_em DESC LIMIT 20"
            ),
        ];
    }

    public function infraStatus(): array
    {
        $backupDir = $this->config['paths']['backups'];
        $backups = [];
        if (is_dir($backupDir)) {
            foreach (glob($backupDir . '/*.sql') ?: [] as $file) {
                $backups[] = [
                    'file' => basename($file),
                    'sizeBytes' => filesize($file) ?: 0,
                    'created_at' => date('c', filemtime($file) ?: time()),
                ];
            }
        }
        usort($backups, static fn (array $a, array $b): int => strcmp($b['created_at'], $a['created_at']));
        return [
            'servidor' => [
                'ambiente' => $this->config['app_env'] ?? 'production',
                'runtime' => 'php',
                'php' => PHP_VERSION,
                'appUrl' => $this->config['base_url'] ?? '',
            ],
            'storage' => [
                'logsDir' => $this->config['paths']['logs'],
                'uploadDir' => $this->config['paths']['uploads'],
                'backupDir' => $backupDir,
                'backupCount' => count($backups),
                'lastBackup' => $backups[0] ?? null,
            ],
            'indicadores' => [
                'gpsRecebidos' => $this->scalar('SELECT COUNT(*) FROM localizacoes'),
                'alertasAbertos' => $this->scalar("SELECT COUNT(*) FROM alertas WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO')"),
                'sincronizacoesPendentes' => 0,
                'emergenciasAbertas' => $this->scalar("SELECT COUNT(*) FROM ocorrencias WHERE UPPER(tipo) IN ('PANICO','EMERGENCIA') AND UPPER(status) NOT IN ('FINALIZADA','FECHADA','RESOLVIDA','CANCELADA')"),
            ],
            'backups' => array_slice($backups, 0, 20),
        ];
    }

    public function dashboardSummary(): array
    {
        return [
            'viagensHoje' => $this->scalar("SELECT COUNT(*) FROM viagens WHERE data_viagem = CURDATE()"),
            'viagensEmAndamento' => $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(COALESCE(status_operacional, status, '')) IN ('EM_ANDAMENTO','EM_TRANSITO','EM_TRANSITO_IDA','EM_TRANSITO_VOLTA','CHEGADA_EMBARQUE','PASSAGEIRO_EMBARCADO','EM_ESPERA','PREPARACAO')"),
            'motoristasAtivos' => $this->scalar("SELECT COUNT(*) FROM motoristas WHERE status IN ('ativo','online','em_operacao')"),
            'ultimaLocalizacao' => $this->db->fetch('SELECT * FROM localizacoes ORDER BY criado_em DESC LIMIT 1'),
            'viagem_ativa' => $this->db->fetch("SELECT * FROM viagens WHERE UPPER(COALESCE(status_operacional, status, '')) IN ('EM_ANDAMENTO','EM_TRANSITO','EM_TRANSITO_IDA','EM_TRANSITO_VOLTA','CHEGADA_EMBARQUE','PASSAGEIRO_EMBARCADO','EM_ESPERA','PREPARACAO') ORDER BY criado_em DESC LIMIT 1"),
        ];
    }


    public function listOperadores(?array $user = null): array
    {
        $this->requireGestor($user);
        $this->ensureOperatorCredentialsTable();
        $items = $this->db->fetchAll(
            "SELECT u.id, u.nome, u.login, u.email, u.perfil, u.status, u.criado_em, u.atualizado_em,
                    oc.cpf, oc.codigo_hint AS app_codigo_hint, oc.atualizado_em AS app_codigo_atualizado_em
             FROM usuarios u
             LEFT JOIN operador_app_credenciais oc ON oc.usuario_id = u.id
             WHERE u.perfil = 'OPERADOR' AND LOWER(COALESCE(u.status, '')) <> 'excluido'
             ORDER BY u.criado_em DESC"
        );
        return ['operadores' => $items, 'items' => $items];
    }

    public function createOperador(array $body, ?array $user = null): array
    {
        $this->requireGestor($user);
        $this->ensureOperatorCredentialsTable();
        $nome = trim((string) ($body['nome'] ?? $body['nome_completo'] ?? ''));
        $cpf = $this->onlyDigits((string) ($body['cpf'] ?? ''));
        $loginInformado = $this->sanitizeLogin((string) ($body['login'] ?? $body['usuario'] ?? ''));
        $loginPainel = $cpf !== '' ? $cpf : ($loginInformado !== '' ? $loginInformado : $this->nextOperatorLogin($nome));
        $credentialKey = $cpf !== '' ? $cpf : $loginPainel;
        $senhaPainel = (string) ($body['senha'] ?? $body['password'] ?? $body['senha_painel'] ?? '');
        if ($nome === '') {
            throw new RuntimeException('Nome do operador e obrigatorio.');
        }
        if (strlen($senhaPainel) < 6) {
            throw new RuntimeException('Senha do painel deve ter pelo menos 6 caracteres.');
        }

        $existingUser = $this->db->fetch(
            "SELECT id, status, perfil FROM usuarios WHERE login = :login LIMIT 1",
            ['login' => $loginPainel]
        );

        if ($existingUser && strtolower((string) ($existingUser['status'] ?? '')) !== 'excluido') {
            throw new RuntimeException('Ja existe usuario ativo com este login. Use outro login ou exclua/bloqueie o usuario existente.');
        }

        $credentialOwner = $this->db->fetch(
            'SELECT usuario_id FROM operador_app_credenciais WHERE cpf = :cpf LIMIT 1',
            ['cpf' => $credentialKey]
        );
        if ($credentialOwner) {
            $ownerId = (string) ($credentialOwner['usuario_id'] ?? '');
            $owner = $this->db->fetch('SELECT id, status FROM usuarios WHERE id = :id LIMIT 1', ['id' => $ownerId]);
            $sameReactivatedUser = $existingUser && $ownerId === (string) ($existingUser['id'] ?? '');
            $ownerDeletedOrMissing = !$owner || strtolower((string) ($owner['status'] ?? '')) === 'excluido';
            if (!$sameReactivatedUser && !$ownerDeletedOrMissing) {
                throw new RuntimeException('Ja existe operador com esta senha/login de aplicativo.');
            }
            if (!$sameReactivatedUser && $ownerDeletedOrMissing) {
                $this->db->execute('DELETE FROM operador_app_credenciais WHERE cpf = :cpf', ['cpf' => $credentialKey]);
            }
        }

        $id = $existingUser ? (string) $existingUser['id'] : $this->newId('usr');
        $senhaApp = $this->newAppPassword(8);

        if ($existingUser) {
            $this->db->execute(
                "UPDATE usuarios
                 SET nome = :nome,
                     email = :email,
                     senha_hash = :senha_hash,
                     perfil = 'OPERADOR',
                     status = 'ativo',
                     atualizado_em = NOW()
                 WHERE id = :id",
                [
                    'id' => $id,
                    'nome' => $nome,
                    'email' => $this->nullable($body, 'email'),
                    'senha_hash' => password_hash($senhaPainel, PASSWORD_DEFAULT),
                ]
            );
        } else {
            $this->db->execute(
                "INSERT INTO usuarios (id, nome, login, email, senha_hash, perfil, status, criado_em, atualizado_em)
                 VALUES (:id, :nome, :login, :email, :senha_hash, 'OPERADOR', 'ativo', NOW(), NOW())",
                [
                    'id' => $id,
                    'nome' => $nome,
                    'login' => $loginPainel,
                    'email' => $this->nullable($body, 'email'),
                    'senha_hash' => password_hash($senhaPainel, PASSWORD_DEFAULT),
                ]
            );
        }

        $this->db->execute(
            "INSERT INTO operador_app_credenciais (usuario_id, cpf, app_senha_hash, codigo_hint, criado_em, atualizado_em)
             VALUES (:usuario_id, :cpf, :app_senha_hash, :codigo_hint, NOW(), NOW())
             ON DUPLICATE KEY UPDATE cpf = VALUES(cpf), app_senha_hash = VALUES(app_senha_hash), codigo_hint = VALUES(codigo_hint), atualizado_em = NOW()",
            [
                'usuario_id' => $id,
                'cpf' => $credentialKey,
                'app_senha_hash' => password_hash($senhaApp, PASSWORD_DEFAULT),
                'codigo_hint' => substr($senhaApp, -2),
            ]
        );
        $operator = $this->db->fetch(
            "SELECT u.id, u.nome, u.login, u.email, u.perfil, u.status, u.criado_em, oc.cpf, oc.codigo_hint AS app_codigo_hint
             FROM usuarios u LEFT JOIN operador_app_credenciais oc ON oc.usuario_id = u.id WHERE u.id = :id LIMIT 1",
            ['id' => $id]
        );
        $this->audit->record($existingUser ? 'reativacao' : 'criacao', 'usuarios', $id, $user, ['perfil' => 'OPERADOR']);
        return [
            'operador' => $operator,
            'login_painel' => $loginPainel,
            'senha_app' => $senhaApp,
            'codigo_app' => $senhaApp,
            'aviso' => 'Anote a senha do aplicativo agora. Ela nao sera exibida novamente.',
        ];
    }

    public function deleteOperador(string $id, ?array $user = null): array
    {
        $this->requireGestor($user);
        $id = trim($id);
        if ($id === '') {
            throw new RuntimeException('ID do operador e obrigatorio.');
        }
        if (($user['id'] ?? '') === $id) {
            throw new RuntimeException('O gestor nao pode excluir a propria sessao.');
        }
        $operator = $this->db->fetch("SELECT * FROM usuarios WHERE id = :id AND perfil = 'OPERADOR' LIMIT 1", ['id' => $id]);
        if (!$operator || strtolower((string) ($operator['status'] ?? '')) === 'excluido') {
            throw new RuntimeException('Operador nao encontrado.');
        }
        $this->db->execute("UPDATE usuarios SET status = 'excluido', atualizado_em = NOW() WHERE id = :id AND perfil = 'OPERADOR'", ['id' => $id]);
        $this->db->execute('DELETE FROM refresh_tokens WHERE usuario_id = :id', ['id' => $id]);
        $this->audit->record('exclusao_logica', 'usuarios', $id, $user, ['perfil' => 'OPERADOR']);
        return ['excluido' => true, 'operador_id' => $id];
    }

    public function listMotoristas(): array
    {
        $this->ensureDriverAppPasswordColumns();
        $items = $this->db->fetchAll(
            "SELECT id, nome, cpf, matricula, telefone, email, status, metadados, criado_em, atualizado_em,
                    CASE WHEN app_senha_atual IS NULL OR app_senha_atual = '' THEN 0 ELSE 1 END AS tem_senha_app,
                    RIGHT(COALESCE(app_senha_atual, ''), 4) AS app_senha_hint,
                    app_senha_gerada_em, app_senha_expira_em
             FROM motoristas
             WHERE LOWER(COALESCE(status, '')) <> 'excluido'
             ORDER BY criado_em DESC"
        );
        return ['motoristas' => $items, 'items' => $items];
    }

    public function revealMotoristaAppPassword(string $id, ?array $user = null): array
    {
        $id = trim($id);
        if ($id === '') {
            throw new RuntimeException('ID do motorista e obrigatorio.');
        }
        $this->ensureDriverAppPasswordColumns();
        $driver = $this->db->fetch(
            "SELECT id, nome, app_senha_atual, app_senha_gerada_em, app_senha_expira_em
             FROM motoristas
             WHERE id = :id AND LOWER(COALESCE(status, '')) <> 'excluido'
             LIMIT 1",
            ['id' => $id]
        );
        if (!$driver || trim((string) ($driver['app_senha_atual'] ?? '')) === '') {
            throw new RuntimeException('Senha do app nao encontrada para este motorista. Gere uma nova senha.');
        }
        $this->audit->record('consulta_credencial_app', 'motoristas', $id, $user, ['acao' => 'revelar_senha_app_motorista']);
        return [
            'motorista_id' => $id,
            'nome' => $driver['nome'] ?? '',
            'senha_app' => (string) $driver['app_senha_atual'],
            'codigo_ativacao' => (string) $driver['app_senha_atual'],
            'hint' => substr((string) $driver['app_senha_atual'], -4),
            'gerada_em' => $driver['app_senha_gerada_em'] ?? null,
            'expira_em' => $driver['app_senha_expira_em'] ?? null,
        ];
    }

    public function createMotorista(array $body, ?array $user = null): array
    {
        $this->ensureDriverAppPasswordColumns();
        $id = $this->newId('mot');
        $nome = trim((string) ($body['nome'] ?? ''));
        if ($nome === '') {
            throw new RuntimeException('Nome do motorista e obrigatorio.');
        }

        $senhaApp = $this->normalizeActivationCode((string) (
            $body['senha_app']
            ?? $body['codigo_app']
            ?? $body['codigo_ativacao']
            ?? $body['activation_code']
            ?? ''
        ));
        if ($senhaApp === '') {
            $senhaApp = $this->newAppPassword(8);
        }
        if (strlen($senhaApp) < 4) {
            throw new RuntimeException('Senha do app deve ter pelo menos 4 caracteres.');
        }

        $this->db->execute(
            'INSERT INTO motoristas (id, nome, cpf, matricula, telefone, email, senha_hash, status, metadados, criado_em, atualizado_em) VALUES (:id, :nome, :cpf, :matricula, :telefone, :email, :senha_hash, :status, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'nome' => $nome,
                'cpf' => $this->nullable($body, 'cpf'),
                'matricula' => $this->nullable($body, 'matricula'),
                'telefone' => $this->nullable($body, 'telefone'),
                'email' => $this->nullable($body, 'email'),
                'senha_hash' => null,
                'status' => $body['status'] ?? 'ativo',
                'metadados' => $this->json($body),
            ]
        );

        $this->db->execute(
            'UPDATE motoristas SET app_senha_atual = :app_senha_atual, app_senha_hash = :app_senha_hash, app_senha_gerada_em = NOW(), app_senha_expira_em = NULL, atualizado_em = NOW() WHERE id = :id',
            [
                'id' => $id,
                'app_senha_atual' => $senhaApp,
                'app_senha_hash' => password_hash($senhaApp, PASSWORD_DEFAULT),
            ]
        );

        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id', ['id' => $id]);
        $serverUrl = $this->publicServerUrl();
        $activation = [
            'tipo' => 'MOTORISTA_APP_PASSWORD',
            'versao' => 1,
            'motorista_id' => $id,
            'codigo' => $senhaApp,
            'senha_app' => $senhaApp,
            'endpoint' => '/api/driver/activate',
            'server_url' => $serverUrl,
            'api_base_url' => $serverUrl,
            'expira_em' => null,
        ];

        $this->audit->record('criacao', 'motoristas', $id, $user, ['cadastro_minimo' => true]);
        return [
            'motorista' => $driver,
            'ativacao' => $activation,
            'activation' => $activation,
            'senha_app' => $senhaApp,
            'codigo_ativacao' => $senhaApp,
            'aviso' => 'Motorista cadastrado com nome e senha do app. CPF, matricula, telefone e CNH podem ser preenchidos depois.',
        ];
    }


    public function deleteMotorista(string $id, ?array $user = null): array
    {
        $id = trim($id);
        if ($id === '') {
            throw new RuntimeException('ID do motorista e obrigatorio.');
        }
        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$driver || strtolower((string) ($driver['status'] ?? '')) === 'excluido') {
            throw new RuntimeException('Motorista nao encontrado.');
        }
        $activeTrips = $this->scalar(
            "SELECT COUNT(*) FROM viagens WHERE motorista_id = :id AND UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')",
            ['id' => $id]
        );
        if ((int) $activeTrips > 0) {
            throw new RuntimeException('Nao e possivel excluir motorista com viagem ativa ou pendente. Finalize/cancele as viagens primeiro.');
        }
        $this->db->execute(
            "UPDATE motoristas SET status = 'excluido', atualizado_em = NOW(), metadados = :metadados WHERE id = :id",
            [
                'id' => $id,
                'metadados' => $this->json([
                    'excluido_em' => date('c'),
                    'excluido_por' => $user['id'] ?? null,
                    'registro_anterior' => $driver,
                ]),
            ]
        );
        $this->db->execute('UPDATE motorista_qr_tokens SET usado_em = COALESCE(usado_em, NOW()) WHERE motorista_id = :id', ['id' => $id]);
        $this->audit->record('exclusao_logica', 'motoristas', $id, $user);
        return ['excluido' => true, 'motorista_id' => $id];
    }

    public function driverQr(string $id, array $body, ?array $user = null): array
    {
        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$driver) {
            throw new RuntimeException('Motorista nao encontrado.');
        }
        if (in_array(strtolower((string) ($driver['status'] ?? '')), ['excluido', 'inativo', 'bloqueado'], true)) {
            throw new RuntimeException('Motorista inativo ou excluido nao pode gerar QR Code.');
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
            'codigo_manual' => $token,
            'expira_em' => date('c', strtotime($expires)),
        ];
        if ($this->config['base_url'] !== '') {
            $serverUrl = preg_replace('#/api/?$#', '', rtrim((string) $this->config['base_url'], '/'));
            $payload['server_url'] = $serverUrl;
            $payload['api_base_url'] = $serverUrl;
            $payload['api'] = $serverUrl;
        }
        $this->audit->record('alteracao_critica', 'motoristas', $id, $user, ['acao' => 'gerar_qrcode']);
        return [
            'motorista' => $driver,
            'qr' => [
                'texto' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'payload' => $payload,
                'codigo_manual' => $token,
                'expira_em' => $payload['expira_em'],
            ],
        ];
    }


    public function driverActivationCode(string $id, array $body, ?array $user = null): array
    {
        $this->ensureDriverActivationTable();
        $this->ensureDriverAppPasswordColumns();
        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$driver) {
            throw new RuntimeException('Motorista nao encontrado.');
        }
        if (in_array(strtolower((string) ($driver['status'] ?? '')), ['excluido', 'inativo', 'bloqueado'], true)) {
            throw new RuntimeException('Motorista inativo ou excluido nao pode gerar codigo de ativacao.');
        }

        $this->db->execute(
            'UPDATE motorista_activation_codes SET revogado_em = COALESCE(revogado_em, NOW()) WHERE motorista_id = :motorista_id AND usado_em IS NULL AND revogado_em IS NULL',
            ['motorista_id' => $id]
        );

        $code = $this->newActivationCode();
        $expiresSeconds = (int) ($body['validade_segundos'] ?? $body['ttl_seconds'] ?? 86400);
        if ($expiresSeconds < 600) {
            $expiresSeconds = 600;
        }
        if ($expiresSeconds > 604800) {
            $expiresSeconds = 604800;
        }
        $expires = date('Y-m-d H:i:s', time() + $expiresSeconds);
        $serverUrl = $this->publicServerUrl();

        $this->db->execute(
            'INSERT INTO motorista_activation_codes (id, motorista_id, code_hash, codigo_hint, origem, ip, expira_em, criado_em) VALUES (:id, :motorista_id, :code_hash, :codigo_hint, :origem, :ip, :expira_em, NOW())',
            [
                'id' => $this->newId('act'),
                'motorista_id' => $id,
                'code_hash' => hash('sha256', $this->normalizeActivationCode($code)),
                'codigo_hint' => substr($code, -2),
                'origem' => $body['origem'] ?? 'painel_operador',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'expira_em' => $expires,
            ]
        );

        $this->db->execute(
            'UPDATE motoristas SET app_senha_atual = :app_senha_atual, app_senha_hash = :app_senha_hash, app_senha_gerada_em = NOW(), app_senha_expira_em = :app_senha_expira_em, atualizado_em = NOW() WHERE id = :id',
            [
                'id' => $id,
                'app_senha_atual' => $code,
                'app_senha_hash' => password_hash($this->normalizeActivationCode($code), PASSWORD_DEFAULT),
                'app_senha_expira_em' => $expires,
            ]
        );

        $driver = $this->db->fetch('SELECT * FROM motoristas WHERE id = :id LIMIT 1', ['id' => $id]) ?: $driver;

        $payload = [
            'tipo' => 'MOTORISTA_ACTIVATION_CODE',
            'versao' => 1,
            'motorista_id' => $id,
            'codigo' => $code,
            'activation_code' => $code,
            'endpoint' => '/api/driver/activate',
            'server_url' => $serverUrl,
            'api_base_url' => $serverUrl,
            'api' => $serverUrl,
            'expira_em' => date('c', strtotime($expires)),
        ];

        $this->audit->record('alteracao_critica', 'motoristas', $id, $user, ['acao' => 'gerar_codigo_ativacao']);
        return [
            'motorista' => $driver,
            'ativacao' => $payload,
            'activation' => $payload,
            'codigo_manual' => $code,
            'codigo' => $code,
            'expira_em' => $payload['expira_em'],
        ];
    }

    public function driverActivate(array $body): array
    {
        $this->ensureDriverActivationTable();
        $code = $this->normalizeActivationCode((string) ($body['codigo'] ?? $body['code'] ?? $body['activation_code'] ?? $body['codigo_ativacao'] ?? $body['senha_app'] ?? $body['senha'] ?? ''));
        $nomeInformado = $this->normalizeName((string) ($body['nome'] ?? $body['motorista_nome'] ?? $body['identificador'] ?? ''));
        if ($code === '') {
            throw new RuntimeException('Codigo de ativacao e obrigatorio.');
        }

        $this->ensureDriverAppPasswordColumns();
        $row = $this->db->fetch(
            "SELECT ac.*, ac.id AS activation_id, m.id AS id, m.nome, m.matricula, m.cpf, m.email, m.status, m.app_senha_hash, m.app_senha_atual
            FROM motorista_activation_codes ac
            INNER JOIN motoristas m ON m.id = ac.motorista_id
            WHERE ac.code_hash = :code_hash
              AND ac.usado_em IS NULL
              AND ac.revogado_em IS NULL
              AND ac.expira_em > NOW()
              AND LOWER(COALESCE(m.status, '')) NOT IN ('excluido','inativo','bloqueado')
            LIMIT 1",
            ['code_hash' => hash('sha256', $code)]
        );

        $activationId = null;
        if ($row) {
            $activationId = (string) $row['activation_id'];
        } else {
            $drivers = $this->db->fetchAll(
                "SELECT id, nome, matricula, cpf, email, status, app_senha_hash, app_senha_atual
                 FROM motoristas
                 WHERE app_senha_hash IS NOT NULL
                   AND LOWER(COALESCE(status, '')) NOT IN ('excluido','inativo','bloqueado')"
            );
            foreach ($drivers as $driverRow) {
                if ($nomeInformado !== '' && !$this->driverMatchesName($driverRow, $nomeInformado)) {
                    continue;
                }
                if (password_verify($code, (string) ($driverRow['app_senha_hash'] ?? ''))) {
                    $row = $driverRow + [
                        'motorista_id' => $driverRow['id'],
                        'activation_id' => null,
                    ];
                    break;
                }
            }
            if (!$row && $nomeInformado !== '') {
                foreach ($drivers as $driverRow) {
                    if (password_verify($code, (string) ($driverRow['app_senha_hash'] ?? ''))) {
                        $row = $driverRow + [
                            'motorista_id' => $driverRow['id'],
                            'activation_id' => null,
                        ];
                        break;
                    }
                }
            }
        }

        if (!$row) {
            $this->audit->failure('driver_activation_failed', 'motoristas', null);
            throw new RuntimeException('Codigo de ativacao expirado ou invalido.');
        }

        if ($activationId !== null) {
            $this->db->execute(
                'UPDATE motorista_activation_codes SET usado_em = NOW(), device_id = :device_id, plataforma = :plataforma WHERE id = :id',
                [
                    'id' => $activationId,
                    'device_id' => $this->limitText($body['device_id'] ?? $body['deviceId'] ?? null, 120),
                    'plataforma' => $this->limitText($body['platform'] ?? $body['plataforma'] ?? 'android', 40),
                ]
            );
        }

        $motorista = $this->driverUser($row);
        $token = $this->driverSessionToken($motorista);
        $serverUrl = $this->publicServerUrl();
        $this->audit->record('login', 'motoristas', (string) $row['motorista_id'], $motorista, ['origem' => 'codigo_ativacao']);

        return [
            'token' => $token,
            'access_token' => $token,
            'motorista_id' => (string) $row['motorista_id'],
            'driver_id' => (string) $row['motorista_id'],
            'motorista' => $motorista,
            'usuario' => $motorista,
            'user' => $motorista,
            'server_url' => $serverUrl,
            'api_base_url' => $serverUrl,
            'api' => $serverUrl,
            'sessao' => [
                'token' => $token,
                'tipo' => 'Bearer',
                'expira_em' => date('c', time() + 86400),
            ],
            'message' => 'Aplicativo ativado com sucesso.',
        ];
    }

    public function driverQrLogin(array $body): array
    {
        $token = trim((string) ($body['token'] ?? $body['codigo_manual'] ?? $body['codigo'] ?? ''));
        $motoristaId = trim((string) ($body['motorista_id'] ?? $body['motoristaId'] ?? ''));
        if ($token === '') {
            throw new RuntimeException('QR Code invalido.');
        }

        $params = ['token_hash' => hash('sha256', $token)];
        $whereMotorista = '';
        if ($motoristaId !== '') {
            $whereMotorista = ' AND qt.motorista_id = :motorista_id';
            $params['motorista_id'] = $motoristaId;
        }

        $row = $this->db->fetch(
            "SELECT qt.*, m.nome, m.matricula, m.cpf, m.status FROM motorista_qr_tokens qt INNER JOIN motoristas m ON m.id = qt.motorista_id WHERE qt.token_hash = :token_hash" . $whereMotorista . " AND LOWER(COALESCE(m.status, '')) NOT IN ('excluido','inativo','bloqueado') AND qt.usado_em IS NULL AND qt.expira_em > NOW() LIMIT 1",
            $params
        );
        if (!$row) {
            $this->audit->failure('auth_qr_failed', 'motoristas', $motoristaId !== '' ? $motoristaId : null);
            throw new RuntimeException('QR Code expirado ou invalido.');
        }
        $this->db->execute('UPDATE motorista_qr_tokens SET usado_em = NOW() WHERE id = :id', ['id' => $row['id']]);
        $motorista = $this->driverUser($row);
        $sessionToken = $this->driverSessionToken($motorista);
        $this->audit->record('login', 'motoristas', (string) $row['motorista_id'], $motorista, ['origem' => 'qr_code']);
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
            'SELECT * FROM motoristas WHERE id = :driver_id OR cpf = :cpf OR matricula = :matricula OR email = :email LIMIT 1',
            ['driver_id' => $identificador, 'cpf' => $identificador, 'matricula' => $identificador, 'email' => $identificador]
        );
        if (!$driver || empty($driver['senha_hash']) || !password_verify($senha, (string) $driver['senha_hash'])) {
            $this->audit->failure('driver_login_failed', 'motoristas', $identificador);
            throw new RuntimeException('Credenciais invalidas.');
        }
        if (in_array(strtolower((string) ($driver['status'] ?? '')), ['excluido', 'inativo', 'bloqueado'], true)) {
            $this->audit->failure('driver_login_inactive', 'motoristas', (string) $driver['id']);
            throw new RuntimeException('Motorista inativo, bloqueado ou excluido.');
        }
        $user = $this->driverUser($driver);
        $token = $this->driverSessionToken($user);
        $this->audit->record('login', 'motoristas', (string) $driver['id'], $user);
        return ['token' => $token, 'motorista' => $user, 'usuario' => $user, 'sessao' => ['token' => $token, 'tipo' => 'Bearer']];
    }

    public function driverTrips(?string $motoristaId = null, ?array $user = null): array
    {
        $params = [];
        $where = [];
        $driverId = $this->driverIdFromRequest($motoristaId, $user);
        if ($driverId !== '') {
            $where[] = 'motorista_id = :motorista_id';
            $params['motorista_id'] = $driverId;
        }
        $where[] = "UPPER(COALESCE(status, '')) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')";

        $sql = 'SELECT * FROM viagens WHERE ' . implode(' AND ', $where) . ' ORDER BY COALESCE(data_viagem, CURDATE()) ASC, criado_em DESC';
        $trips = $this->db->fetchAll($sql, $params);
        foreach ($trips as &$trip) {
            $trip['passageiros'] = $this->db->fetchAll(
                'SELECT * FROM passageiros WHERE viagem_id = :viagem_id ORDER BY criado_em ASC',
                ['viagem_id' => $trip['id']]
            );
            $trip['total_passageiros'] = count($trip['passageiros']);
            if (empty($trip['data_hora_saida'])) {
                $trip['data_hora_saida'] = $trip['hora_saida'] ?? (($trip['data_viagem'] ?? null) ? ($trip['data_viagem'] . ' 00:00:00') : null);
            }
            $trip['status_operacional'] = $trip['status_operacional'] ?? ($trip['status'] ?? null);
        }
        unset($trip);
        return ['trips' => $trips, 'viagens' => $trips, 'items' => $trips, 'motorista_id' => $driverId ?: null];
    }

    public function activeDriverTrip(?string $motoristaId = null, ?array $user = null): array
    {
        $params = [];
        $where = " WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')";
        $driverId = $this->driverIdFromRequest($motoristaId, $user);
        if ($driverId !== '') {
            $where .= ' AND motorista_id = :motorista_id';
            $params['motorista_id'] = $driverId;
        }
        $trip = $this->db->fetch('SELECT * FROM viagens' . $where . ' ORDER BY data_viagem ASC, criado_em DESC LIMIT 1', $params);
        return $trip ?: [];
    }

    public function driverNotices(?string $motoristaId = null, ?array $user = null): array
    {
        $params = [];
        $where = '';
        $driverId = $this->driverIdFromRequest($motoristaId, $user);
        if ($driverId !== '') {
            $where = ' WHERE motorista_id IS NULL OR motorista_id = :motorista_id';
            $params['motorista_id'] = $driverId;
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

    public function listTripPassengers(string $tripId, ?array $user = null): array
    {
        $this->assertDriverCanAccessTripId($tripId, $user);
        return $this->listByTrip('passageiros', $tripId);
    }


    public function driverEvents(?array $user = null): array
    {
        if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
            $items = $this->db->fetchAll(
                'SELECT * FROM eventos WHERE motorista_id = :motorista_id ORDER BY data_hora DESC, criado_em DESC LIMIT 100',
                ['motorista_id' => (string) $user['id']]
            );
            return ['eventos' => $items, 'items' => $items];
        }
        return $this->genericList('eventos');
    }

    public function driverLocations(?array $user = null): array
    {
        if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
            $items = $this->db->fetchAll(
                'SELECT * FROM localizacoes WHERE motorista_id = :motorista_id ORDER BY criado_em DESC LIMIT 100',
                ['motorista_id' => (string) $user['id']]
            );
            return ['localizacoes' => $items, 'items' => $items];
        }
        return $this->genericList('localizacoes');
    }

    public function findById(string $table, string $id): array
    {
        $this->assertTable($table);
        $row = $this->db->fetch("SELECT * FROM {$table} WHERE id = :id LIMIT 1", ['id' => $id]);
        return $row ?: [];
    }

    public function addGps(array $body, ?array $user = null): array
    {
        $viagemId = (string) ($body['viagem_id'] ?? $body['viagemId'] ?? '');
        if ($viagemId === '') {
            throw new RuntimeException('viagem_id e obrigatorio.');
        }
        $trip = $this->db->fetch('SELECT * FROM viagens WHERE id = :id LIMIT 1', ['id' => $viagemId]);
        if (!$trip) {
            throw new RuntimeException('Viagem nao encontrada.');
        }
        $this->assertDriverCanAccessTrip($trip, $user);
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
        $speedLimit = 80.0;
        $trips = $this->db->fetchAll(
            "SELECT
                v.*,
                m.nome AS motorista_nome,
                ve.nome AS veiculo_nome,
                ve.prefixo,
                ve.placa
            FROM viagens v
            LEFT JOIN motoristas m ON m.id = v.motorista_id
            LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
            WHERE UPPER(v.status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')
            ORDER BY v.criado_em DESC"
        );
        $vehicles = [];
        $dynamicAlerts = [];
        $gpsSemAtualizacao = 0;
        $velocidadeAcimaLimite = 0;
        foreach ($trips as $trip) {
            $latest = $this->db->fetch(
                'SELECT id, latitude, longitude, velocidade, metadados, criado_em FROM localizacoes WHERE viagem_id = :viagem_id ORDER BY criado_em DESC LIMIT 1',
                ['viagem_id' => $trip['id']]
            );
            $passageiros = (int) $this->scalar('SELECT COUNT(*) FROM passageiros WHERE viagem_id = :viagem_id', ['viagem_id' => $trip['id']]);
            $ocorrencia = $this->db->fetch(
                "SELECT tipo, status, criado_em
                FROM ocorrencias
                WHERE viagem_id = :viagem_id AND UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO')
                ORDER BY criado_em DESC
                LIMIT 1",
                ['viagem_id' => $trip['id']]
            );
            $semGps = $latest === null || $this->isOlderThanMinutes((string) ($latest['criado_em'] ?? ''), 10);
            $velocidade = $this->normalizeVelocity($latest['velocidade'] ?? null);
            $acimaLimite = $velocidade !== null && $velocidade > $speedLimit;
            if ($semGps) {
                $gpsSemAtualizacao++;
                $dynamicAlerts[] = [
                    'tipo' => 'GPS_SEM_ATUALIZACAO',
                    'descricao' => 'Motorista sem nova leitura de GPS ha mais de 10 minutos.',
                    'viagem_id' => $trip['id'],
                    'motorista_nome' => $trip['motorista_nome'] ?? null,
                    'status' => 'aberto',
                    'criado_em' => $latest['criado_em'] ?? $trip['atualizado_em'] ?? $trip['criado_em'] ?? null,
                ];
            }
            if ($acimaLimite) {
                $velocidadeAcimaLimite++;
                $dynamicAlerts[] = [
                    'tipo' => 'VELOCIDADE_ACIMA_LIMITE',
                    'descricao' => 'Velocidade atual acima de ' . (int) $speedLimit . ' km/h.',
                    'viagem_id' => $trip['id'],
                    'motorista_nome' => $trip['motorista_nome'] ?? null,
                    'status' => 'aberto',
                    'criado_em' => $latest['criado_em'] ?? null,
                ];
            }
            $corStatus = $this->vehicleMapColor((string) ($trip['status'] ?? ''), $latest, $ocorrencia);
            $latitude = $latest['latitude'] ?? null;
            $longitude = $latest['longitude'] ?? null;
            $vehicles[] = [
                'id' => $trip['veiculo_id'] ?: $trip['id'],
                'viagem_id' => $trip['id'],
                'codigo' => $trip['codigo'] ?? null,
                'origem' => $trip['origem'] ?? null,
                'destino' => $trip['destino'] ?? null,
                'motorista_id' => $trip['motorista_id'] ?? null,
                'veiculo_id' => $trip['veiculo_id'] ?? null,
                'motorista' => $trip['motorista_nome'] ?? null,
                'motorista_nome' => $trip['motorista_nome'] ?? null,
                'veiculo_nome' => $trip['veiculo_nome'] ?? null,
                'prefixo' => $trip['prefixo'] ?? null,
                'placa' => $trip['placa'] ?? null,
                'status' => $trip['status'] ?? null,
                'status_viagem' => $trip['status'] ?? null,
                'estado_rota' => $this->routeState((string) ($trip['status'] ?? ''), $semGps, $acimaLimite, $ocorrencia),
                'latitude' => $latitude,
                'longitude' => $longitude,
                'velocidade' => $velocidade,
                'ultima_atualizacao' => $latest['criado_em'] ?? null,
                'gps_sem_atualizacao' => $semGps,
                'velocidade_acima_limite' => $acimaLimite,
                'limite_velocidade' => $speedLimit,
                'passageiros' => $passageiros,
                'alerta_ativo' => $ocorrencia !== null || $semGps || $acimaLimite,
                'tipo_alerta' => $ocorrencia['tipo'] ?? ($semGps ? 'GPS_SEM_ATUALIZACAO' : ($acimaLimite ? 'VELOCIDADE_ACIMA_LIMITE' : null)),
                'cor_status' => $corStatus,
                'waze_url' => $this->wazeUrl($latitude, $longitude),
            ];
        }
        $storedAlerts = $this->db->fetchAll(
            "SELECT tipo, NULL AS viagem_id, descricao, status, criado_em
            FROM alertas
            WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO')
            ORDER BY criado_em DESC
            LIMIT 20"
        );
        $alertas = array_slice(array_merge($dynamicAlerts, $storedAlerts), 0, 30);
        $feed = $this->db->fetchAll('SELECT tipo, descricao, NULL AS status, viagem_id, data_hora AS dataHora FROM eventos ORDER BY data_hora DESC LIMIT 20');
        return [
            'atualizado_em' => date('c'),
            'veiculos' => $vehicles,
            'items' => $vehicles,
            'alertas' => $alertas,
            'feed' => $feed,
            'limite_velocidade' => $speedLimit,
            'indicadores' => [
                'viagensAtivas' => count($vehicles),
                'veiculosEmRota' => count(array_filter($vehicles, static fn (array $vehicle): bool => $vehicle['latitude'] !== null && $vehicle['longitude'] !== null)),
                'alertasAtivos' => count($alertas),
                'ocorrenciasAbertas' => (int) $this->scalar("SELECT COUNT(*) FROM ocorrencias WHERE UPPER(status) NOT IN ('FECHADA','RESOLVIDA','CANCELADA')"),
                'gpsSemAtualizacao' => $gpsSemAtualizacao,
                'velocidadeAcimaLimite' => $velocidadeAcimaLimite,
            ],
        ];
    }

    public function tracking(array $query): array
    {
        $where = [];
        $params = [];
        $tripId = trim((string) ($query['viagem_id'] ?? $query['viagemId'] ?? ''));
        $driverId = trim((string) ($query['motorista_id'] ?? $query['motoristaId'] ?? ''));
        $vehicleId = trim((string) ($query['veiculo_id'] ?? $query['veiculoId'] ?? ''));
        if ($tripId !== '') {
            $where[] = 'l.viagem_id = :viagem_id';
            $params['viagem_id'] = $tripId;
        }
        if ($driverId !== '') {
            $where[] = 'l.motorista_id = :motorista_id';
            $params['motorista_id'] = $driverId;
        }
        if ($vehicleId !== '') {
            $where[] = 'l.veiculo_id = :veiculo_id';
            $params['veiculo_id'] = $vehicleId;
        }
        if (!$where) {
            $where[] = '1=1';
        }
        $limit = max(20, min(800, (int) ($query['limit'] ?? 300)));
        $sql = "SELECT
                l.*,
                v.codigo,
                v.origem,
                v.destino,
                v.status AS status_viagem,
                m.nome AS motorista_nome,
                ve.nome AS veiculo_nome,
                ve.prefixo,
                ve.placa
            FROM localizacoes l
            LEFT JOIN viagens v ON v.id = l.viagem_id
            LEFT JOIN motoristas m ON m.id = l.motorista_id
            LEFT JOIN veiculos ve ON ve.id = l.veiculo_id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY l.criado_em DESC
            LIMIT {$limit}";
        $rows = array_reverse($this->db->fetchAll($sql, $params));
        $distanceMeters = 0.0;
        $previous = null;
        $speeds = [];
        $points = [];
        foreach ($rows as $row) {
            $lat = isset($row['latitude']) ? (float) $row['latitude'] : null;
            $lon = isset($row['longitude']) ? (float) $row['longitude'] : null;
            if ($lat !== null && $lon !== null) {
                if ($previous !== null) {
                    $distanceMeters += $this->distanceMeters((float) $previous['latitude'], (float) $previous['longitude'], $lat, $lon);
                }
                $previous = ['latitude' => $lat, 'longitude' => $lon];
                $points[] = ['latitude' => $lat, 'longitude' => $lon, 'criado_em' => $row['criado_em'] ?? null];
            }
            $speed = $this->normalizeVelocity($row['velocidade'] ?? null);
            if ($speed !== null) {
                $speeds[] = $speed;
            }
        }
        $first = $rows[0] ?? null;
        $last = $rows ? $rows[count($rows) - 1] : null;
        $summary = [
            'total_registros' => count($rows),
            'distancia_km' => round($distanceMeters / 1000, 2),
            'velocidade_media_kmh' => $speeds ? round(array_sum($speeds) / count($speeds), 1) : null,
            'velocidade_maxima_kmh' => $speeds ? max($speeds) : null,
            'inicio' => $first['criado_em'] ?? null,
            'fim' => $last['criado_em'] ?? null,
            'ultima_atualizacao' => $last['criado_em'] ?? null,
            'waze_url' => $last ? $this->wazeUrl($last['latitude'] ?? null, $last['longitude'] ?? null) : null,
        ];
        return [
            'resumo' => $summary,
            'registros' => $rows,
            'pontos' => $points,
            'relatorio' => [
                'titulo' => 'Relatorio da rota percorrida',
                'gerado_em' => date('c'),
                'viagem_id' => $tripId !== '' ? $tripId : ($last['viagem_id'] ?? null),
                'motorista_nome' => $last['motorista_nome'] ?? null,
                'veiculo' => trim((string) (($last['prefixo'] ?? '') . ' ' . ($last['placa'] ?? ''))),
                'origem' => $last['origem'] ?? null,
                'destino' => $last['destino'] ?? null,
                'resumo' => $summary,
            ],
        ];
    }

    public function emergencies(): array
    {
        $items = $this->db->fetchAll(
            "SELECT o.*, v.codigo, v.origem, v.destino, m.nome AS motorista, ve.prefixo, ve.placa
            FROM ocorrencias o
            LEFT JOIN viagens v ON v.id = o.viagem_id
            LEFT JOIN motoristas m ON m.id = v.motorista_id
            LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
            WHERE UPPER(o.tipo) IN ('PANICO','EMERGENCIA','OCORRENCIA')
            ORDER BY o.criado_em DESC
            LIMIT 100"
        );
        return ['emergencias' => $items, 'items' => $items];
    }

    public function updateEmergency(string $id, string $status, ?array $user = null): array
    {
        $this->db->execute('UPDATE ocorrencias SET status = :status, atualizado_em = NOW() WHERE id = :id', ['status' => $status, 'id' => $id]);
        $this->audit->record('alteracao', 'ocorrencias', $id, $user, ['status' => $status]);
        return ['emergencia' => $this->db->fetch('SELECT * FROM ocorrencias WHERE id = :id LIMIT 1', ['id' => $id])];
    }

    public function pairingStatus(string $id): array
    {
        $pairing = $this->db->fetch('SELECT * FROM motorista_qr_tokens WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$pairing) {
            $pairing = $this->db->fetch('SELECT * FROM motorista_qr_tokens WHERE motorista_id = :id ORDER BY criado_em DESC LIMIT 1', ['id' => $id]);
        }
        return [
            'pairing' => $pairing,
            'status' => $pairing ? $this->pairingState($pairing) : 'nao_encontrado',
        ];
    }

    public function cancelPairing(string $id, ?array $user = null): array
    {
        $affected = $this->db->execute(
            'UPDATE motorista_qr_tokens SET usado_em = COALESCE(usado_em, NOW()) WHERE id = :pairing_id OR motorista_id = :motorista_id',
            ['pairing_id' => $id, 'motorista_id' => $id]
        );
        $this->audit->record('alteracao_critica', 'motorista_qr_tokens', $id, $user, ['acao' => 'cancelar_pareamento']);
        return ['cancelado' => $affected > 0];
    }

    public function driverPassengerAction(string $id, string $action, array $body, ?array $user = null): array
    {
        $statusByAction = [
            'boarding' => 'EMBARCADO',
            'dropoff' => 'DESEMBARCADO',
            'absent' => 'AUSENTE',
        ];
        $status = $statusByAction[$action] ?? null;
        if ($status === null) {
            throw new RuntimeException('Acao de passageiro invalida.');
        }
        $passenger = $this->db->fetch('SELECT * FROM passageiros WHERE id = :id LIMIT 1', ['id' => $id]);
        if (!$passenger) {
            throw new RuntimeException('Passageiro nao encontrado.');
        }
        if (!empty($passenger['viagem_id'])) {
            $this->assertDriverCanAccessTripId((string) $passenger['viagem_id'], $user);
        }
        $this->db->execute(
            'UPDATE passageiros SET status = :status, metadados = :metadados, atualizado_em = NOW() WHERE id = :id',
            ['status' => $status, 'metadados' => $this->json($body), 'id' => $id]
        );
        $this->createEvent([
            'viagem_id' => $passenger['viagem_id'] ?? null,
            'tipo' => 'PASSAGEIRO_' . $status,
            'descricao' => 'Status do passageiro atualizado pelo app motorista.',
            'passageiro_id' => $id,
        ]);
        $this->audit->record('alteracao', 'passageiros', $id, null, ['status' => $status]);
        return ['passageiro' => $this->db->fetch('SELECT * FROM passageiros WHERE id = :id LIMIT 1', ['id' => $id])];
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
        if ($table === 'pacientes') {
            $this->ensurePatientStatusColumn();
            $items = $this->db->fetchAll("SELECT * FROM pacientes WHERE LOWER(COALESCE(status, 'ativo')) <> 'excluido' ORDER BY criado_em DESC LIMIT 200");
            return ['pacientes' => $items, 'items' => $items];
        }
        if ($table === 'passageiros') {
            $items = $this->db->fetchAll("SELECT * FROM passageiros WHERE UPPER(COALESCE(status, 'AGUARDANDO')) <> 'EXCLUIDO' ORDER BY criado_em DESC LIMIT 200");
            return ['passageiros' => $items, 'items' => $items];
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
        if ($table === 'passageiros') {
            return ['passageiro' => $this->createPassenger($body, $user)];
        }
        if ($table === 'viagens') {
            return ['viagem' => $this->createTrip($body, $user)];
        }
        if ($table === 'destinos') {
            return ['destino' => $this->createDestination($body, $user)];
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


    public function genericDelete(string $table, string $id, ?array $user = null): array
    {
        $this->assertTable($table);
        $id = trim($id);
        if ($id === '') {
            throw new RuntimeException('ID obrigatorio para exclusao.');
        }
        if ($table === 'pacientes') {
            $this->ensurePatientStatusColumn();
            $patient = $this->db->fetch('SELECT * FROM pacientes WHERE id = :id LIMIT 1', ['id' => $id]);
            if (!$patient || strtolower((string) ($patient['status'] ?? 'ativo')) === 'excluido') {
                throw new RuntimeException('Paciente ou acompanhante nao encontrado.');
            }
            $this->db->execute(
                "UPDATE pacientes SET status = 'excluido', atualizado_em = NOW(), metadados = :metadados WHERE id = :id",
                [
                    'id' => $id,
                    'metadados' => $this->json([
                        'excluido_em' => date('c'),
                        'excluido_por' => $user['id'] ?? null,
                        'registro_anterior' => $patient,
                    ]),
                ]
            );
            $this->audit->record('exclusao_logica', 'pacientes', $id, $user);
            return ['excluido' => true, 'paciente_id' => $id];
        }
        if ($table === 'passageiros') {
            $passenger = $this->db->fetch('SELECT * FROM passageiros WHERE id = :id LIMIT 1', ['id' => $id]);
            if (!$passenger || strtoupper((string) ($passenger['status'] ?? '')) === 'EXCLUIDO') {
                throw new RuntimeException('Passageiro nao encontrado.');
            }
            $this->db->execute(
                "UPDATE passageiros SET status = 'EXCLUIDO', atualizado_em = NOW(), metadados = :metadados WHERE id = :id",
                [
                    'id' => $id,
                    'metadados' => $this->json([
                        'excluido_em' => date('c'),
                        'excluido_por' => $user['id'] ?? null,
                        'registro_anterior' => $passenger,
                    ]),
                ]
            );
            $this->audit->record('exclusao_logica', 'passageiros', $id, $user);
            return ['excluido' => true, 'passageiro_id' => $id];
        }
        if ($table === 'destinos') {
            $this->ensureDestinationsTable();
            $destination = $this->db->fetch('SELECT * FROM destinos WHERE id = :id LIMIT 1', ['id' => $id]);
            if (!$destination) {
                throw new RuntimeException('Destino nao encontrado.');
            }
            $this->db->execute('DELETE FROM destinos WHERE id = :id', ['id' => $id]);
            $this->audit->record('exclusao', 'destinos', $id, $user, ['registro_anterior' => $destination]);
            return ['excluido' => true, 'destino_id' => $id];
        }
        throw new RuntimeException('Exclusao nao permitida para esta colecao.');
    }

    public function driverChecklist(string $tripId, array $body, ?array $user = null): array
    {
        $this->assertDriverCanAccessTripId($tripId, $user);
        $body['viagem_id'] = $tripId;
        $checklist = $this->createChecklist($body);
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'CHECKLIST', 'descricao' => 'Checklist pre-viagem recebido']);
        return ['checklist' => $checklist];
    }

    public function driverInitialKm(string $tripId, array $body, ?array $user = null): array
    {
        $this->assertDriverCanAccessTripId($tripId, $user);
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

    public function driverFlow(string $tripId, array $body, ?array $user = null): array
    {
        $this->assertDriverCanAccessTripId($tripId, $user);
        $status = $this->statusFromAction((string) ($body['action'] ?? $body['acao'] ?? $body['status'] ?? ''));
        $this->db->execute('UPDATE viagens SET status = :status, atualizado_em = NOW() WHERE id = :id', ['status' => $status, 'id' => $tripId]);
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'VIAGEM_STATUS', 'descricao' => 'Status alterado para ' . $status]);
        return ['viagem' => $this->findTrip($tripId)];
    }

    public function driverFinalizeTrip(string $tripId, array $body, ?array $user = null): array
    {
        $this->assertDriverCanAccessTripId($tripId, $user);
        $this->db->execute('UPDATE viagens SET km_retorno = :km_retorno, hora_retorno = NOW(), status = :status, observacoes = COALESCE(:observacoes, observacoes), atualizado_em = NOW() WHERE id = :id', [
            'km_retorno' => $body['km_final'] ?? $body['km_retorno'] ?? null,
            'status' => 'CONCLUIDA',
            'observacoes' => $body['resumo'] ?? null,
            'id' => $tripId,
        ]);
        $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'VIAGEM_FINALIZADA', 'descricao' => 'Viagem finalizada pelo app motorista']);
        return ['viagem' => $this->findTrip($tripId)];
    }

    public function driverPanic(array $body, ?array $user = null): array
    {
        $tripId = (string) ($body['viagem_id'] ?? $body['viagemId'] ?? '');
        if ($tripId !== '') {
            $this->assertDriverCanAccessTripId($tripId, $user);
        }
        $alert = $this->createAlert($body + ['tipo' => 'PANICO', 'status' => 'aberto', 'descricao' => 'Panico acionado pelo motorista']);
        $this->createEvent($body + ['tipo' => 'PANICO', 'descricao' => 'Panico acionado pelo motorista']);
        if (isset($body['latitude'], $body['longitude'])) {
            $this->createLocation($body);
        }
        return ['alerta' => $alert];
    }

    public function driverProof(array $body, ?array $user = null): array
    {
        $tripId = (string) ($body['viagem_id'] ?? $body['viagemId'] ?? '');
        if ($tripId !== '') {
            $this->assertDriverCanAccessTripId($tripId, $user);
        }
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

    public function driverTripStatus(array $body, ?array $user = null): array
    {
        $tripId = (string) ($body['viagem_id'] ?? $body['viagemId'] ?? $body['id'] ?? '');
        if ($tripId === '') {
            throw new RuntimeException('viagem_id e obrigatorio.');
        }
        $this->assertDriverCanAccessTripId($tripId, $user);
        $status = $this->normalizeStatus((string) ($body['status'] ?? 'PENDENTE_SINCRONIZACAO'));
        $this->db->execute('UPDATE viagens SET status = :status, atualizado_em = NOW() WHERE id = :id', ['status' => $status, 'id' => $tripId]);
        $event = $this->createEvent(['viagem_id' => $tripId, 'motorista_id' => $body['motorista_id'] ?? null, 'tipo' => 'DRIVER_TRIP_STATUS', 'descricao' => 'Status recebido do app', 'metadados' => $this->json($body)]);
        return ['syncLog' => $event, 'viagem' => $this->findTrip($tripId)];
    }

    public function driverSync(array $body, ?array $user = null): array
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

    public function listTripStatuses(?array $user = null): array
    {
        if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
            $items = $this->db->fetchAll(
                'SELECT id, status, motorista_id, atualizado_em FROM viagens WHERE motorista_id = :motorista_id ORDER BY atualizado_em DESC',
                ['motorista_id' => (string) $user['id']]
            );
            return ['viagens' => $items, 'items' => $items];
        }
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
        $this->ensurePatientStatusColumn();
        $name = trim((string) ($body['nome'] ?? ''));
        if ($name === '') {
            throw new RuntimeException('Nome do paciente ou acompanhante e obrigatorio.');
        }
        $type = strtolower(trim((string) ($body['tipo'] ?? 'paciente'))) ?: 'paciente';
        if (!in_array($type, ['paciente', 'acompanhante'], true)) {
            $type = 'paciente';
        }
        $id = (string) ($body['id'] ?? $this->newId('pac'));
        $this->db->execute(
            'INSERT INTO pacientes (id, nome, tipo, cpf, telefone, status, metadados, criado_em, atualizado_em) VALUES (:id, :nome, :tipo, :cpf, :telefone, :status, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'nome' => $this->limitText($name, 160),
                'tipo' => $type,
                'cpf' => $this->limitText($body['cpf'] ?? null, 32),
                'telefone' => $this->limitText($body['telefone'] ?? null, 60),
                'status' => $body['status'] ?? 'ativo',
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'pacientes', $id, $user);
        return $this->db->fetch('SELECT * FROM pacientes WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function createPassenger(array $body, ?array $user = null): array
    {
        $patient = null;
        $patientId = trim((string) ($body['paciente_id'] ?? $body['pacienteId'] ?? ''));
        if ($patientId !== '') {
            $patient = $this->db->fetch('SELECT * FROM pacientes WHERE id = :id LIMIT 1', ['id' => $patientId]);
        }
        $name = trim((string) ($body['nome'] ?? $patient['nome'] ?? ''));
        if ($name === '') {
            throw new RuntimeException('Informe o paciente/acompanhante ou digite um nome.');
        }
        $id = (string) ($body['id'] ?? $this->newId('pas'));
        $this->db->execute(
            'INSERT INTO passageiros (id, viagem_id, paciente_id, nome, tipo, cpf, telefone, status, metadados, criado_em, atualizado_em) VALUES (:id, :viagem_id, :paciente_id, :nome, :tipo, :cpf, :telefone, :status, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'viagem_id' => $body['viagem_id'] ?? $body['viagemId'] ?? null,
                'paciente_id' => $patientId !== '' ? $patientId : null,
                'nome' => $this->limitText($name, 160),
                'tipo' => strtoupper((string) ($body['tipo'] ?? $patient['tipo'] ?? 'PACIENTE')),
                'cpf' => $this->limitText($body['cpf'] ?? $patient['cpf'] ?? null, 32),
                'telefone' => $this->limitText($body['telefone'] ?? $patient['telefone'] ?? null, 60),
                'status' => strtoupper((string) ($body['status'] ?? 'AGUARDANDO')),
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'passageiros', $id, $user);
        return $this->db->fetch('SELECT * FROM passageiros WHERE id = :id', ['id' => $id]) ?: [];
    }


    private function createDestination(array $body, ?array $user = null): array
    {
        $this->ensureDestinationsTable();
        $name = trim((string) ($body['nome'] ?? $body['name'] ?? ''));
        $address = trim((string) ($body['endereco'] ?? $body['address'] ?? ''));
        if ($name === '' || $address === '') {
            throw new RuntimeException('Nome e endereco do destino sao obrigatorios.');
        }
        $type = trim((string) ($body['tipo'] ?? 'outro')) ?: 'outro';
        $allowedTypes = ['hospital', 'clinica', 'unidade_saude', 'residencia', 'outro'];
        if (!in_array($type, $allowedTypes, true)) {
            throw new RuntimeException('Tipo de destino invalido.');
        }
        $city = $this->limitText($body['cidade'] ?? null, 120);
        $phone = $this->limitText($body['telefone'] ?? null, 40);
        $notes = $this->limitText($body['observacoes'] ?? null, 1000);
        $existing = $this->db->fetch(
            'SELECT * FROM destinos WHERE LOWER(nome) = LOWER(:nome) AND LOWER(endereco) = LOWER(:endereco) LIMIT 1',
            ['nome' => $name, 'endereco' => $address]
        );
        if ($existing) {
            return $existing;
        }
        $id = (string) ($body['id'] ?? $this->newId('dst'));
        $this->db->execute(
            'INSERT INTO destinos (id, nome, tipo, endereco, cidade, telefone, observacoes, metadados, criado_em, atualizado_em) VALUES (:id, :nome, :tipo, :endereco, :cidade, :telefone, :observacoes, :metadados, NOW(), NOW())',
            [
                'id' => $id,
                'nome' => $this->limitText($name, 180),
                'tipo' => $type,
                'endereco' => $this->limitText($address, 255),
                'cidade' => $city,
                'telefone' => $phone,
                'observacoes' => $notes,
                'metadados' => $this->json($body),
            ]
        );
        $this->audit->record('criacao', 'destinos', $id, $user);
        return $this->db->fetch('SELECT * FROM destinos WHERE id = :id', ['id' => $id]) ?: [];
    }

    private function ensurePatientStatusColumn(): void
    {
        $column = $this->db->fetch(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'status' LIMIT 1"
        );
        if (!$column) {
            $this->db->execute("ALTER TABLE pacientes ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'ativo' AFTER telefone");
        }
    }

    private function ensureDestinationsTable(): void
    {
        $this->db->execute(
            'CREATE TABLE IF NOT EXISTS destinos (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                nome VARCHAR(180) NOT NULL,
                tipo VARCHAR(40) DEFAULT "outro",
                endereco VARCHAR(255) NOT NULL,
                cidade VARCHAR(120) NULL,
                telefone VARCHAR(40) NULL,
                observacoes TEXT NULL,
                metadados LONGTEXT NULL,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_destinos_nome (nome),
                INDEX idx_destinos_cidade (cidade)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
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
                'velocidade' => $this->normalizeVelocity($body['velocidade'] ?? null),
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



    private function ensureDriverAppPasswordColumns(): void
    {
        $this->addColumnIfMissing('motoristas', 'app_senha_atual', 'VARCHAR(32) NULL');
        $this->addColumnIfMissing('motoristas', 'app_senha_hash', 'VARCHAR(255) NULL');
        $this->addColumnIfMissing('motoristas', 'app_senha_gerada_em', 'DATETIME NULL');
        $this->addColumnIfMissing('motoristas', 'app_senha_expira_em', 'DATETIME NULL');
    }

    private function addColumnIfMissing(string $table, string $column, string $definition): void
    {
        $row = $this->db->fetch(
            'SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column',
            ['table' => $table, 'column' => $column]
        );
        if ((int) ($row['total'] ?? 0) === 0) {
            $this->db->execute(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', str_replace('`', '', $table), str_replace('`', '', $column), $definition));
        }
    }

    private function ensureOperatorCredentialsTable(): void
    {
        $this->db->execute(
            "CREATE TABLE IF NOT EXISTS operador_app_credenciais (
                usuario_id VARCHAR(64) PRIMARY KEY,
                cpf VARCHAR(32) NOT NULL,
                app_senha_hash VARCHAR(255) NOT NULL,
                codigo_hint VARCHAR(8) NULL,
                criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_operador_app_cpf (cpf),
                CONSTRAINT fk_operador_app_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    private function requireGestor(?array $user): void
    {
        $profile = strtoupper((string) ($user['perfil'] ?? ''));
        if (!in_array($profile, ['GESTOR', 'ADMIN'], true)) {
            throw new DomainException('Apenas gestor pode executar esta acao.');
        }
    }

    private function sanitizeLogin(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9._-]+/i', '', $value) ?? '';
        return substr($value, 0, 48);
    }

    private function nextOperatorLogin(string $nome): string
    {
        $base = strtolower(trim($nome));
        $base = preg_replace('/[^a-z0-9]+/i', '.', $base) ?? '';
        $base = trim($base, '.');
        if ($base === '') {
            $base = 'operador';
        }
        $base = substr($base, 0, 28);
        do {
            $login = $base . '.' . random_int(100, 999);
            $exists = $this->db->fetch('SELECT id FROM usuarios WHERE login = :login LIMIT 1', ['login' => $login]);
        } while ($exists !== null);
        return $login;
    }

    private function normalizeName(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/\s+/', ' ', $value) ?? '';
        return $value;
    }

    private function driverMatchesName(array $driver, string $normalizedName): bool
    {
        if ($normalizedName === '') {
            return true;
        }
        $candidates = [
            (string) ($driver['nome'] ?? ''),
            (string) ($driver['matricula'] ?? ''),
            (string) ($driver['cpf'] ?? ''),
            (string) ($driver['id'] ?? ''),
        ];
        foreach ($candidates as $candidate) {
            if ($candidate !== '' && $this->normalizeName($candidate) === $normalizedName) {
                return true;
            }
        }
        return false;
    }

    private function onlyDigits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    private function ensureDriverActivationTable(): void
    {
        $this->db->execute(
            "CREATE TABLE IF NOT EXISTS motorista_activation_codes (
                id VARCHAR(64) PRIMARY KEY,
                motorista_id VARCHAR(64) NOT NULL,
                code_hash CHAR(64) NOT NULL UNIQUE,
                codigo_hint VARCHAR(8) NULL,
                origem VARCHAR(80) NULL,
                ip VARCHAR(64) NULL,
                device_id VARCHAR(120) NULL,
                plataforma VARCHAR(40) NULL,
                expira_em DATETIME NOT NULL,
                usado_em DATETIME NULL,
                revogado_em DATETIME NULL,
                criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_activation_motorista (motorista_id),
                INDEX idx_activation_expira (expira_em),
                INDEX idx_activation_usado (usado_em),
                CONSTRAINT fk_activation_motorista FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    private function newAppPassword(int $length = 8): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $max = strlen($alphabet) - 1;
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= $alphabet[random_int(0, $max)];
        }
        return $code;
    }

    private function newActivationCode(int $length = 6): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $max = strlen($alphabet) - 1;
        do {
            $code = '';
            for ($i = 0; $i < $length; $i++) {
                $code .= $alphabet[random_int(0, $max)];
            }
            $exists = $this->db->fetch(
                'SELECT id FROM motorista_activation_codes WHERE code_hash = :code_hash AND usado_em IS NULL AND revogado_em IS NULL AND expira_em > NOW() LIMIT 1',
                ['code_hash' => hash('sha256', $code)]
            );
        } while ($exists !== null);
        return $code;
    }

    private function normalizeActivationCode(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9]/i', '', trim($code)) ?? '');
    }

    private function publicServerUrl(): string
    {
        $base = rtrim((string) ($this->config['base_url'] ?? ''), '/');
        if ($base === '') {
            return '';
        }
        return preg_replace('#/api/?$#', '', $base) ?: $base;
    }


    private function driverIdFromRequest(?string $requestedId, ?array $user = null): string
    {
        if (strtoupper((string) ($user['perfil'] ?? '')) === 'MOTORISTA') {
            return (string) ($user['id'] ?? '');
        }
        return trim((string) ($requestedId ?? ''));
    }

    private function assertDriverCanAccessTripId(string $tripId, ?array $user = null): void
    {
        if (strtoupper((string) ($user['perfil'] ?? '')) !== 'MOTORISTA') {
            return;
        }
        $trip = $this->db->fetch('SELECT id, motorista_id FROM viagens WHERE id = :id LIMIT 1', ['id' => $tripId]);
        if (!$trip) {
            throw new RuntimeException('Viagem nao encontrada.');
        }
        $this->assertDriverCanAccessTrip($trip, $user);
    }

    private function assertDriverCanAccessTrip(array $trip, ?array $user = null): void
    {
        if (strtoupper((string) ($user['perfil'] ?? '')) !== 'MOTORISTA') {
            return;
        }
        if ((string) ($trip['motorista_id'] ?? '') !== (string) ($user['id'] ?? '')) {
            throw new RuntimeException('Viagem nao atribuida a este motorista.');
        }
    }

    public function driverUserFromBearer(?string $header): ?array
    {
        if (!$header || substr($header, 0, 7) !== 'Bearer ') {
            return null;
        }
        $claims = $this->driverFromSessionToken(substr($header, 7));
        $driverId = trim((string) ($claims['sub'] ?? ''));
        $profile = strtoupper((string) ($claims['perfil'] ?? ''));
        if ($driverId === '' || $profile !== 'MOTORISTA') {
            return null;
        }
        $driver = $this->db->fetch(
            "SELECT * FROM motoristas
             WHERE id = :id
               AND LOWER(COALESCE(status, '')) NOT IN ('excluido','inativo','bloqueado')
             LIMIT 1",
            ['id' => $driverId]
        );
        return $driver ? $this->driverUser($driver) : null;
    }

    private function driverSessionToken(array $driver): string
    {
        $jwt = new Jwt((string) ($this->config['jwt_secret'] ?? ''), (string) ($this->config['jwt_issuer'] ?? 'agsap'));
        return $jwt->sign([
            'sub' => (string) $driver['id'],
            'nome' => (string) ($driver['nome'] ?? ''),
            'login' => (string) ($driver['login'] ?? $driver['id']),
            'perfil' => 'MOTORISTA',
        ], 86400);
    }

    private function driverFromSessionToken(string $token): array
    {
        if ($token === '') {
            return [];
        }
        try {
            $jwt = new Jwt((string) ($this->config['jwt_secret'] ?? ''), (string) ($this->config['jwt_issuer'] ?? 'agsap'));
            return $jwt->verify($token);
        } catch (Throwable $error) {
            return [];
        }
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

    private function normalizeVelocity($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        $speed = (float) $value;
        if (!is_finite($speed) || $speed < 0) {
            return null;
        }
        return round($speed, 1);
    }

    private function routeState(string $status, bool $gpsStopped, bool $speeding, ?array $occurrence): string
    {
        if ($occurrence !== null) {
            return 'OCORRENCIA_ABERTA';
        }
        if ($speeding) {
            return 'VELOCIDADE_ACIMA_LIMITE';
        }
        if ($gpsStopped) {
            return 'GPS_SEM_ATUALIZACAO';
        }
        return $this->normalizeStatus($status ?: 'EM_ROTA');
    }

    private function wazeUrl($latitude, $longitude): ?string
    {
        if ($latitude === null || $longitude === null) {
            return null;
        }
        $lat = (float) $latitude;
        $lon = (float) $longitude;
        if (!is_finite($lat) || !is_finite($lon)) {
            return null;
        }
        return 'https://www.waze.com/ul?ll=' . rawurlencode($lat . ',' . $lon) . '&navigate=yes&zoom=17';
    }

    private function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function vehicleMapColor(string $status, ?array $location, ?array $occurrence): string
    {
        $normalizedStatus = $this->normalizeStatus($status);
        if ($occurrence !== null || str_contains($normalizedStatus, 'PANICO') || str_contains($normalizedStatus, 'ALERTA')) {
            return 'VERMELHO';
        }
        if ($location === null) {
            return 'CINZA';
        }
        if ((float) ($location['velocidade'] ?? 0) > 80) {
            return 'LARANJA';
        }
        if ($this->isOlderThanMinutes((string) ($location['criado_em'] ?? ''), 10)) {
            return 'AMARELO';
        }
        return 'AZUL';
    }

    private function isOlderThanMinutes(string $dateTime, int $minutes): bool
    {
        if ($dateTime === '') {
            return true;
        }
        $timestamp = strtotime($dateTime);
        if ($timestamp === false) {
            return true;
        }
        return $timestamp < (time() - ($minutes * 60));
    }

    private function pairingState(array $pairing): string
    {
        if (!empty($pairing['usado_em'])) {
            return 'usado';
        }
        $expires = strtotime((string) ($pairing['expira_em'] ?? ''));
        if ($expires !== false && $expires < time()) {
            return 'expirado';
        }
        return 'pendente';
    }

    private function responseKey(string $table): string
    {
        $map = ['localizacoes' => 'localizacoes', 'eventos' => 'eventos'];
        return $map[$table] ?? $table;
    }

    private function assertTable(string $table): void
    {
        $allowed = ['viagens', 'veiculos', 'pacientes', 'passageiros', 'despesas', 'ocorrencias', 'alertas', 'mensagens', 'checklists', 'eventos', 'localizacoes', 'destinos', 'avisos', 'comprovantes'];
        if (!in_array($table, $allowed, true)) {
            throw new RuntimeException('Colecao invalida.');
        }
    }

    private function scalar(string $sql, array $params = [])
    {
        $row = $this->db->fetch('SELECT (' . $sql . ') AS valor', $params);
        return $row ? $row['valor'] + 0 : 0;
    }


    private function limitText($value, int $max): ?string
    {
        $text = trim((string) ($value ?? ''));
        if ($text === '') {
            return null;
        }
        if (function_exists('mb_substr')) {
            return mb_substr($text, 0, $max);
        }
        return substr($text, 0, $max);
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
