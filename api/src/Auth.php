<?php

declare(strict_types=1);

final class Auth
{
    private Database $db;
    private Jwt $jwt;
    private array $config;
    private AuditLogger $audit;

    public function __construct(
        Database $db,
        Jwt $jwt,
        array $config,
        AuditLogger $audit
    ) {
        $this->db = $db;
        $this->jwt = $jwt;
        $this->config = $config;
        $this->audit = $audit;
    }

    public function login(array $body): array
    {
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
        $tokens = $this->issueTokens($publicUser);
        $this->audit->record('login', 'usuarios', (string) $user['id'], $publicUser);
        return ['usuario' => $publicUser] + $tokens;
    }

    public function refresh(string $refreshToken): array
    {
        if ($refreshToken === '') {
            throw new RuntimeException('Refresh token obrigatório.');
        }
        $hash = hash('sha256', $refreshToken);
        $stored = $this->db->fetch(
            'SELECT rt.*, u.nome, u.login, u.email, u.perfil, u.status FROM refresh_tokens rt INNER JOIN usuarios u ON u.id = rt.usuario_id WHERE rt.token_hash = :hash AND rt.revogado_em IS NULL AND rt.expira_em > NOW() LIMIT 1',
            ['hash' => $hash]
        );
        if (!$stored || ($stored['status'] ?? '') !== 'ativo') {
            throw new RuntimeException('Refresh token inválido.');
        }
        return ['usuario' => $this->publicUser($stored)] + $this->issueTokens($this->publicUser($stored));
    }

    public function logout(string $refreshToken, ?array $user): array
    {
        if ($refreshToken !== '') {
            $this->db->execute(
                'UPDATE refresh_tokens SET revogado_em = NOW() WHERE token_hash = :hash',
                ['hash' => hash('sha256', $refreshToken)]
            );
        }
        $this->audit->record('logout', 'usuarios', $user['id'] ?? null, $user);
        return ['logout' => true];
    }

    public function userFromBearer(?string $header): ?array
    {
        if (!$header || substr($header, 0, 7) !== 'Bearer ') {
            return null;
        }
        $claims = $this->jwt->verify(substr($header, 7));
        return [
            'id' => (string) ($claims['sub'] ?? ''),
            'nome' => (string) ($claims['nome'] ?? ''),
            'login' => (string) ($claims['login'] ?? ''),
            'perfil' => strtoupper((string) ($claims['perfil'] ?? '')),
        ];
    }

    private function issueTokens(array $user): array
    {
        $access = $this->jwt->sign([
            'sub' => (string) $user['id'],
            'nome' => $user['nome'],
            'login' => $user['login'],
            'perfil' => $user['perfil'],
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
        return [
            'accessToken' => $access,
            'refreshToken' => $refresh,
            'tokenType' => 'Bearer',
            'expiresIn' => $this->config['jwt_access_ttl'],
        ];
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

        if ($attempts >= 8) {
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
            'id' => (string) $user['id'],
            'nome' => (string) ($user['nome'] ?? ''),
            'login' => (string) ($user['login'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'perfil' => strtoupper((string) ($user['perfil'] ?? 'CIDADAO')),
        ];
    }
}
