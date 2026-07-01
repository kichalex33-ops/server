<?php

declare(strict_types=1);

final class Auth
{
    private Database $db;
    private Jwt $jwt;
    private array $config;
    private AuditLogger $audit;
    private bool $authHardeningReady = false;

    public function __construct(Database $db, Jwt $jwt, array $config, AuditLogger $audit)
    {
        $this->db = $db;
        $this->jwt = $jwt;
        $this->config = $config;
        $this->audit = $audit;
    }

    public function login(array $body): array
    {
        $this->ensureAuthHardening();

        $login = trim((string) ($body['login'] ?? $body['email'] ?? ''));
        $password = (string) ($body['password'] ?? $body['senha'] ?? '');
        if ($login === '' || $password === '') {
            $this->audit->failure('auth_login_missing', 'usuarios', null);
            throw new RuntimeException('Login e senha são obrigatórios.');
        }

        $this->enforceLoginRateLimit($login);

        $user = $this->db->fetch(
            'SELECT * FROM usuarios WHERE login = :login OR email = :email LIMIT 1',
            ['login' => $login, 'email' => $login]
        );
        if (!$user || !password_verify($password, (string) $user['senha_hash'])) {
            $this->registerFailedLogin($login);
            $this->audit->failure('auth_login_failed', 'usuarios', $login);
            throw new RuntimeException('Login inválido.');
        }
        if (($user['status'] ?? 'ativo') !== 'ativo') {
            $this->registerFailedLogin($login);
            throw new RuntimeException('Usuário inativo.');
        }
        $this->clearLoginAttempts($login);
        $publicUser = $this->publicUser($user);
        $tokens = $this->issueTokens($user);
        $this->audit->record('login', 'usuarios', (string) $user['id'], $publicUser);
        return ['usuario' => $publicUser] + $tokens;
    }

    public function refresh(string $refreshToken): array
    {
        $this->ensureAuthHardening();

        if ($refreshToken === '') {
            throw new RuntimeException('Refresh token obrigatório.');
        }
        $hash = hash('sha256', $refreshToken);
        $stored = $this->db->fetch(
            'SELECT rt.*, u.nome, u.login, u.email, u.perfil, u.status, u.token_version FROM refresh_tokens rt INNER JOIN usuarios u ON u.id = rt.usuario_id WHERE rt.token_hash = :hash AND rt.revogado_em IS NULL AND rt.expira_em > NOW() LIMIT 1',
            ['hash' => $hash]
        );
        if (!$stored || ($stored['status'] ?? '') !== 'ativo') {
            throw new RuntimeException('Refresh token inválido.');
        }
        return ['usuario' => $this->publicUser($stored)] + $this->issueTokens([
            'id' => (string) $stored['usuario_id'],
            'nome' => (string) ($stored['nome'] ?? ''),
            'login' => (string) ($stored['login'] ?? ''),
            'email' => (string) ($stored['email'] ?? ''),
            'perfil' => (string) ($stored['perfil'] ?? 'CIDADAO'),
            'token_version' => (int) ($stored['token_version'] ?? 1),
        ]);
    }

    public function logout(string $refreshToken, ?array $user): array
    {
        $this->ensureAuthHardening();

        if ($refreshToken !== '') {
            $this->db->execute(
                'UPDATE refresh_tokens SET revogado_em = NOW() WHERE token_hash = :hash',
                ['hash' => hash('sha256', $refreshToken)]
            );
        }
        $this->blacklistCurrentAccessToken($user);
        $this->audit->record('logout', 'usuarios', $user['id'] ?? null, $user);
        return ['logout' => true];
    }

    public function revokeAllTokens(?array $user): array
    {
        $this->ensureAuthHardening();

        $userId = (string) ($user['id'] ?? '');
        if ($userId === '') {
            throw new RuntimeException('Usuário autenticado obrigatório.');
        }
        $this->db->execute('UPDATE usuarios SET token_version = token_version + 1 WHERE id = :id', ['id' => $userId]);
        $this->db->execute('UPDATE refresh_tokens SET revogado_em = NOW() WHERE usuario_id = :id AND revogado_em IS NULL', ['id' => $userId]);
        $this->blacklistCurrentAccessToken($user);
        $this->audit->record('auth_revoke_all', 'usuarios', $userId, $user);
        return ['revoked' => true];
    }

    public function userFromBearer(?string $header): ?array
    {
        $this->ensureAuthHardening();

        if (!$header || stripos($header, 'Bearer ') !== 0) {
            return null;
        }
        $claims = $this->jwt->verify(substr($header, 7));
        $jti = (string) ($claims['jti'] ?? '');
        if ($jti === '' || $this->isAccessTokenBlacklisted($jti)) {
            throw new RuntimeException('Token revogado.');
        }

        $userId = (string) ($claims['sub'] ?? '');
        if ($userId === '') {
            throw new RuntimeException('Token inválido.');
        }

        $stored = $this->db->fetch(
            'SELECT id, nome, login, email, perfil, status, token_version FROM usuarios WHERE id = :id LIMIT 1',
            ['id' => $userId]
        );
        if (!$stored || ($stored['status'] ?? 'ativo') !== 'ativo') {
            throw new RuntimeException('Token inválido.');
        }

        $claimVersion = (int) ($claims['v'] ?? 0);
        $storedVersion = (int) ($stored['token_version'] ?? 1);
        if ($claimVersion < 1 || $claimVersion !== $storedVersion) {
            throw new RuntimeException('Token revogado.');
        }

        $_SERVER['AUTH_USER_ID'] = (string) $stored['id'];
        $_SERVER['AUTH_ROLE'] = strtoupper((string) ($stored['perfil'] ?? 'CIDADAO'));
        $_SERVER['AUTH_JTI'] = $jti;
        $_SERVER['AUTH_EXP'] = (string) ($claims['exp'] ?? '');
        $_SERVER['AUTH_TOKEN_VERSION'] = (string) $storedVersion;

        return [
            'id' => (string) $stored['id'],
            'nome' => (string) ($stored['nome'] ?? ''),
            'login' => (string) ($stored['login'] ?? ''),
            'perfil' => strtoupper((string) ($stored['perfil'] ?? '')),
            'token_version' => $storedVersion,
        ];
    }


    public function sessions(?array $user): array
    {
        $this->ensureAuthHardening();
        $userId = (string) ($user['id'] ?? '');
        if ($userId === '') {
            throw new RuntimeException('Usuário autenticado obrigatório.');
        }
        $rows = $this->db->fetchAll(
            'SELECT id, ip, user_agent, expira_em, revogado_em, criado_em FROM refresh_tokens WHERE usuario_id = :id ORDER BY criado_em DESC LIMIT 30',
            ['id' => $userId]
        );
        return ['sessoes' => array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'ip' => $row['ip'] ?? null,
                'user_agent' => $row['user_agent'] ?? null,
                'expira_em' => $row['expira_em'] ?? null,
                'revogado_em' => $row['revogado_em'] ?? null,
                'criado_em' => $row['criado_em'] ?? null,
                'ativa' => empty($row['revogado_em']) && strtotime((string) ($row['expira_em'] ?? '')) > time(),
            ];
        }, $rows)];
    }

    public function revokeSession(string $sessionId, ?array $user): array
    {
        $this->ensureAuthHardening();
        $userId = (string) ($user['id'] ?? '');
        $sessionId = trim($sessionId);
        if ($userId === '' || $sessionId === '') {
            throw new RuntimeException('Sessão inválida.');
        }
        $affected = $this->db->execute(
            'UPDATE refresh_tokens SET revogado_em = NOW() WHERE id = :id AND usuario_id = :usuario_id AND revogado_em IS NULL',
            ['id' => $sessionId, 'usuario_id' => $userId]
        );
        $this->audit->record('auth_revoke_session', 'refresh_tokens', $sessionId, $user);
        return ['revogada' => $affected > 0, 'sessao_id' => $sessionId];
    }

    private function issueTokens(array $user): array
    {
        $this->ensureAuthHardening();

        // H526 FIX: revogar TODAS as sessões anteriores do usuário antes de emitir nova
        // Impede que refresh tokens roubados continuem válidos após novo login.
        $this->db->execute(
            'UPDATE refresh_tokens SET revogado_em = NOW() WHERE usuario_id = :uid AND revogado_em IS NULL',
            ['uid' => $user['id']]
        );

        $tokenVersion = (int) ($user['token_version'] ?? $this->tokenVersion((string) $user['id']));
        if ($tokenVersion < 1) {
            $tokenVersion = 1;
        }

        $access = $this->jwt->sign([
            'sub' => (string) $user['id'],
            'jti' => bin2hex(random_bytes(16)),
            'v' => $tokenVersion,
            'nome' => (string) ($user['nome'] ?? ''),
            'login' => (string) ($user['login'] ?? ''),
            'perfil' => strtoupper((string) ($user['perfil'] ?? 'CIDADAO')),
        ], $this->config['jwt_access_ttl']);
        $refresh = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + $this->config['jwt_refresh_ttl']);
        $this->db->execute(
            'INSERT INTO refresh_tokens (usuario_id, token_hash, ip, user_agent, expira_em, criado_em) VALUES (:usuario_id, :token_hash, :ip, :user_agent, :expira_em, NOW())',
            [
                'usuario_id' => $user['id'],
                'token_hash' => hash('sha256', $refresh),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
                'expira_em' => $expires,
            ]
        );
        $ttl = (int) $this->config['jwt_access_ttl'];
        return [
            'accessToken' => $access,
            'token' => $access,
            'refreshToken' => $refresh,
            'tokenType' => 'Bearer',
            'expiresIn' => $ttl,
            'expires_in' => $ttl,
        ];
    }

    private function ensureAuthHardening(): void
    {
        if ($this->authHardeningReady) {
            return;
        }

        $this->db->execute(
            "CREATE TABLE IF NOT EXISTS jwt_blacklist (
                jti VARCHAR(64) PRIMARY KEY,
                usuario_id VARCHAR(64) NULL,
                revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                INDEX idx_jwt_blacklist_expires (expires_at),
                INDEX idx_jwt_blacklist_user (usuario_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        if (!$this->tableHasColumn('usuarios', 'token_version')) {
            $this->db->execute('ALTER TABLE usuarios ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER status');
        }

        $this->authHardeningReady = true;
    }

    private function blacklistCurrentAccessToken(?array $user): void
    {
        $jti = trim((string) ($_SERVER['AUTH_JTI'] ?? ''));
        $exp = (int) ($_SERVER['AUTH_EXP'] ?? 0);
        if ($jti === '' || $exp <= time()) {
            return;
        }
        $this->db->execute(
            'INSERT IGNORE INTO jwt_blacklist (jti, usuario_id, expires_at, revoked_at) VALUES (:jti, :usuario_id, FROM_UNIXTIME(:exp), NOW())',
            [
                'jti' => $jti,
                'usuario_id' => $user['id'] ?? null,
                'exp' => $exp,
            ]
        );
    }

    private function isAccessTokenBlacklisted(string $jti): bool
    {
        $row = $this->db->fetch('SELECT jti FROM jwt_blacklist WHERE jti = :jti AND expires_at > NOW() LIMIT 1', ['jti' => $jti]);
        return (bool) $row;
    }

    private function tokenVersion(string $userId): int
    {
        $row = $this->db->fetch('SELECT token_version FROM usuarios WHERE id = :id LIMIT 1', ['id' => $userId]);
        return (int) ($row['token_version'] ?? 1);
    }

    private function tableHasColumn(string $table, string $column): bool
    {
        $row = $this->db->fetch(
            'SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column',
            ['table' => $table, 'column' => $column]
        );
        return ((int) ($row['total'] ?? 0)) > 0;
    }

    private function ensureLoginAttemptsTable(): void
    {
        $this->db->execute(
            "CREATE TABLE IF NOT EXISTS login_attempts (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                login_key CHAR(64) NOT NULL,
                ip VARCHAR(64) NOT NULL,
                succeeded TINYINT(1) NOT NULL DEFAULT 0,
                criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_login_attempts_lookup (login_key, ip, criado_em),
                INDEX idx_login_attempts_created (criado_em)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    }

    private function enforceLoginRateLimit(string $login): void
    {
        $this->ensureLoginAttemptsTable();
        $loginKey = $this->loginAttemptKey($login);
        $ip = $this->clientIp();
        $attempts = (int) (($this->db->fetch(
            "SELECT COUNT(*) AS total
             FROM login_attempts
             WHERE login_key = :login_key
               AND ip = :ip
               AND succeeded = 0
               AND criado_em >= (NOW() - INTERVAL 15 MINUTE)",
            ['login_key' => $loginKey, 'ip' => $ip]
        )['total'] ?? 0));

        if ($attempts >= 5) {
            $this->audit->failure('auth_login_rate_limited', 'usuarios', $login);
            throw new RuntimeException('Muitas tentativas de login. Aguarde 15 minutos e tente novamente.');
        }
    }

    private function registerFailedLogin(string $login): void
    {
        $this->ensureLoginAttemptsTable();
        $this->db->execute(
            'INSERT INTO login_attempts (login_key, ip, succeeded, criado_em) VALUES (:login_key, :ip, 0, NOW())',
            ['login_key' => $this->loginAttemptKey($login), 'ip' => $this->clientIp()]
        );
        $this->cleanupLoginAttempts();
    }

    private function clearLoginAttempts(string $login): void
    {
        $this->ensureLoginAttemptsTable();
        $this->db->execute(
            'INSERT INTO login_attempts (login_key, ip, succeeded, criado_em) VALUES (:login_key, :ip, 1, NOW())',
            ['login_key' => $this->loginAttemptKey($login), 'ip' => $this->clientIp()]
        );
        $this->db->execute(
            'DELETE FROM login_attempts WHERE login_key = :login_key AND ip = :ip AND succeeded = 0',
            ['login_key' => $this->loginAttemptKey($login), 'ip' => $this->clientIp()]
        );
        $this->cleanupLoginAttempts();
    }

    private function cleanupLoginAttempts(): void
    {
        $this->db->execute('DELETE FROM login_attempts WHERE criado_em < (NOW() - INTERVAL 7 DAY)');
    }

    private function loginAttemptKey(string $login): string
    {
        return hash('sha256', strtolower(trim($login)));
    }

    private function clientIp(): string
    {
        $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
        if ($forwarded !== '') {
            $parts = explode(',', $forwarded);
            return substr(trim($parts[0]), 0, 64);
        }
        return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 64);
    }

    private function publicUser(array $user): array
    {
        return [
            'id' => (string) ($user['id'] ?? $user['usuario_id'] ?? ''),
            'nome' => (string) ($user['nome'] ?? ''),
            'login' => (string) ($user['login'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'perfil' => strtoupper((string) ($user['perfil'] ?? 'CIDADAO')),
        ];
    }
}
