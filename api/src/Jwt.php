<?php

declare(strict_types=1);

final class Jwt
{
    private string $secret;
    private string $issuer;

    public function __construct(string $secret, string $issuer)
    {
        $this->secret = $secret;
        $this->issuer = $issuer;
        if ($this->secret === '') {
            throw new RuntimeException('JWT_SECRET não configurado.');
        }
    }

    public function sign(array $claims, int $ttl): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'iss' => $this->issuer,
            'iat' => $now,
            'exp' => $now + $ttl,
        ]);
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [$this->b64(json_encode($header)), $this->b64(json_encode($payload))];
        $segments[] = $this->b64(hash_hmac('sha256', implode('.', $segments), $this->secret, true));
        return implode('.', $segments);
    }

    public function verify(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Token inválido.');
        }
        [$header, $payload, $signature] = $parts;
        $expected = $this->b64(hash_hmac('sha256', $header . '.' . $payload, $this->secret, true));
        if (!hash_equals($expected, $signature)) {
            throw new RuntimeException('Assinatura inválida.');
        }
        $claims = json_decode($this->unb64($payload), true);
        if (!is_array($claims) || ($claims['exp'] ?? 0) < time()) {
            throw new RuntimeException('Token expirado.');
        }
        return $claims;
    }

    private function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function unb64(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
