<?php

declare(strict_types=1);

abstract class BaseController
{
    protected Auth $auth;
    protected ApiService $service;
    protected AiService $ai;
    protected ?array $user;

    public function __construct(Auth $auth, ApiService $service, AiService $ai, ?array $user = null)
    {
        $this->auth = $auth;
        $this->service = $service;
        $this->ai = $ai;
        $this->user = $user;
    }

    public function setUser(?array $user): void
    {
        $this->user = $user;
    }

    protected function user(): ?array
    {
        return $this->user;
    }

    protected function ok(array $data = [], int $status = 200): void
    {
        Response::ok($data, $status);
    }

    protected function csv(string $filename, array $rows): void
    {
        Response::csv($filename, $rows);
    }

    protected function driverScopedBody(array $body): array
    {
        if (strtoupper((string) ($this->user['perfil'] ?? '')) === 'MOTORISTA') {
            $driverId = (string) ($this->user['id'] ?? '');
            if ($driverId !== '') {
                $body['motorista_id'] = $driverId;
                $body['motoristaId'] = $driverId;
            }
        }
        return $body;
    }
}
