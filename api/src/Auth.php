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
        $user = $this->db->fetch(
            'SELECT * FROM usuarios WHERE login = :login OR email = :login LIMIT 1',
            ['login' => $login]
        );
        if (!$user || !password_verify($password, (string) $user['senha_hash'])) {
            $this->audit->failure('auth_login_failed', 'usuarios', $login);
            throw new RuntimeException('Login inválido.');
        }
        if (($user['status'] ?? 'ativo') !== 'ativo') {
            throw new RuntimeException('Usuário inativo.');
        }
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
