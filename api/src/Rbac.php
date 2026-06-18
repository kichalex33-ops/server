<?php

declare(strict_types=1);

final class Rbac
{
    private array $rules = [
        'ADMIN' => ['*'],
        'GESTOR' => ['gestao', 'indicadores', 'graficos', 'auditoria', 'lgpd', 'export', 'motoristas'],
        'OPERADOR' => ['dashboard', 'indicadores', 'graficos', 'motoristas', 'viagens', 'passageiros', 'localizacoes', 'gps', 'live-map', 'alertas', 'mensagens', 'checklists', 'ocorrencias', 'despesas', 'sync', 'panico', 'emergencias', 'giroflex', 'watchdog', 'antifraude'],
        'MOTORISTA' => ['driver'],
        'CIDADAO' => ['status'],
    ];

    public function require(array $user, string $resource): void
    {
        $profile = strtoupper((string) ($user['perfil'] ?? ''));
        $allowed = $this->rules[$profile] ?? [];
        if (!in_array('*', $allowed, true) && !in_array($resource, $allowed, true)) {
            throw new DomainException('Acesso negado.');
        }
    }
}
