<?php

declare(strict_types=1);

final class Validator
{
    /** @var array<string, array<string, mixed>> */
    private const SCHEMAS = [
        'POST /auth/login' => [
            'require_any' => [['login', 'email'], ['password', 'senha']],
            'allowed' => ['login', 'email', 'password', 'senha', 'perfil', 'profile'],
            'strings' => ['login' => 128, 'email' => 180, 'password' => 256, 'senha' => 256, 'perfil' => 32, 'profile' => 32],
        ],
        'POST /auth/refresh' => [
            'require_any' => [['refreshToken', 'refresh_token']],
            'allowed' => ['refreshToken', 'refresh_token'],
            'strings' => ['refreshToken' => 256, 'refresh_token' => 256],
        ],
        'POST /auth/logout' => [
            'allowed' => ['refreshToken', 'refresh_token'],
            'strings' => ['refreshToken' => 256, 'refresh_token' => 256],
        ],
        'POST /gestao/operadores' => [
            'required' => ['nome'],
            'allowed' => ['nome', 'nome_completo', 'cpf', 'login', 'usuario', 'email', 'senha', 'password', 'senha_painel', 'status', 'perfil'],
            'strings' => ['nome' => 160, 'nome_completo' => 180, 'cpf' => 20, 'login' => 80, 'usuario' => 80, 'email' => 180, 'senha' => 256, 'password' => 256, 'senha_painel' => 256, 'status' => 32, 'perfil' => 32],
        ],
        'POST /motoristas' => [
            'required' => ['nome'],
            'allowed' => ['nome', 'cpf', 'matricula', 'telefone', 'email', 'status', 'cnh', 'numero_cnh', 'cnh_validade', 'validade_cnh'],
            'strings' => ['nome' => 160, 'cpf' => 20, 'matricula' => 60, 'telefone' => 40, 'email' => 180, 'status' => 32, 'cnh' => 40, 'numero_cnh' => 40, 'cnh_validade' => 20, 'validade_cnh' => 20],
        ],
        'POST /sync/offline' => [
            'required' => ['actions'],
            'allowed' => ['actions', 'client_id', 'device_id', 'sent_at'],
            'arrays' => ['actions'],
            'strings' => ['client_id' => 80, 'device_id' => 80, 'sent_at' => 40],
        ],
        'POST /sync/resolve-conflict' => [
            'require_any' => [['id', 'sync_id']],
            'allowed' => ['id', 'sync_id', 'table', 'tabela', 'payload', 'strategy', 'client_timestamp', 'version'],
            'strings' => ['id' => 80, 'sync_id' => 80, 'table' => 80, 'tabela' => 80, 'strategy' => 40, 'client_timestamp' => 40],
        ],
        'POST /notifications/subscribe' => [
            'allowed' => ['endpoint', 'expirationTime', 'keys', 'subscription', 'device_id'],
            'strings' => ['endpoint' => 2048, 'device_id' => 120],
        ],
        'POST /presenca' => [
            'allowed' => ['page', 'status', 'device_id'],
            'strings' => ['page' => 180, 'status' => 40, 'device_id' => 120],
        ],
        'PUT /users/preferences' => [
            'allowed' => ['preferences', 'preferencias'],
            'arrays' => ['preferences', 'preferencias'],
        ],
        'POST /analytics/events' => [
            'allowed' => ['events', 'eventos', 'device_id'],
            'arrays' => ['events', 'eventos'],
            'strings' => ['device_id' => 120],
        ],
    ];

    public static function validateRoute(string $routeKey, array $body): array
    {
        self::guardPayload($body);
        $schema = self::SCHEMAS[$routeKey] ?? null;
        if (!$schema) {
            return $body;
        }
        return self::validate($body, $schema);
    }


    private static function guardPayload(array $body, int $depth = 0): void
    {
        if ($depth > 6) {
            throw new InvalidArgumentException('JSON da requisição excede a profundidade permitida.');
        }
        $reserved = [
            'senha_hash', 'password_hash', 'token_version', 'jwt_secret', 'refresh_tokens',
            'jwt_blacklist', 'is_admin', 'admin', 'permissoes', 'permissions'
        ];
        foreach ($body as $key => $value) {
            $normalized = strtolower((string) $key);
            if (in_array($normalized, $reserved, true)) {
                throw new InvalidArgumentException('Campo reservado não permitido: ' . $key);
            }
            if (is_string($value)) {
                $maxLength = in_array($normalized, ['assinatura', 'signature', 'imagem', 'image', 'data_url'], true) ? 350000 : 5000;
                if (strlen($value) > $maxLength) {
                    throw new InvalidArgumentException('Campo excede o tamanho máximo: ' . $key);
                }
                if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) {
                    throw new InvalidArgumentException('Campo contém caracteres inválidos: ' . $key);
                }
            } elseif (is_array($value)) {
                self::guardPayload($value, $depth + 1);
            }
        }
    }

    /** @param array<string, mixed> $schema */
    public static function validate(array $body, array $schema): array
    {
        self::rejectUnexpected($body, $schema['allowed'] ?? []);
        foreach (($schema['required'] ?? []) as $field) {
            if (!array_key_exists($field, $body) || self::blank($body[$field])) {
                throw new InvalidArgumentException('Campo obrigatório ausente: ' . $field);
            }
        }
        foreach (($schema['require_any'] ?? []) as $group) {
            $ok = false;
            foreach ($group as $field) {
                if (array_key_exists($field, $body) && !self::blank($body[$field])) {
                    $ok = true;
                    break;
                }
            }
            if (!$ok) {
                throw new InvalidArgumentException('Informe um dos campos: ' . implode(', ', $group));
            }
        }
        foreach (($schema['strings'] ?? []) as $field => $max) {
            if (!array_key_exists($field, $body) || $body[$field] === null) {
                continue;
            }
            if (!is_scalar($body[$field])) {
                throw new InvalidArgumentException('Campo deve ser texto: ' . $field);
            }
            $value = trim((string) $body[$field]);
            if (strlen($value) > (int) $max) {
                throw new InvalidArgumentException('Campo excede o limite: ' . $field);
            }
            $body[$field] = $value;
        }
        foreach (($schema['arrays'] ?? []) as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            if (!is_array($body[$field])) {
                throw new InvalidArgumentException('Campo deve ser lista/objeto: ' . $field);
            }
        }
        return $body;
    }

    /** @param array<int, string> $allowed */
    private static function rejectUnexpected(array $body, array $allowed): void
    {
        if ($allowed === []) {
            return;
        }
        $allowedMap = array_flip($allowed);
        foreach (array_keys($body) as $field) {
            if (!isset($allowedMap[$field])) {
                throw new InvalidArgumentException('Campo não permitido: ' . $field);
            }
        }
    }

    private static function blank($value): bool
    {
        return $value === null || (is_string($value) && trim($value) === '') || (is_array($value) && $value === []);
    }
}
