<?php

declare(strict_types=1);

final class Rbac
{
    private array $rules = [
        'ADMIN' => ['*'],
        'GESTOR' => ['gestao', 'relatorios', 'operadores', 'sync', 'indicadores', 'graficos', 'auditoria', 'lgpd', 'seguranca', 'infra', 'export', 'motoristas', 'viagens', 'veiculos', 'pacientes', 'destinos', 'passageiros', 'trip-passengers', 'live-map', 'rastreamento', 'tracking', 'gps', 'ai'],
        'OPERADOR' => ['dashboard', 'relatorios', 'indicadores', 'graficos', 'motoristas', 'viagens', 'veiculos', 'pacientes', 'destinos', 'passageiros', 'trip-passengers', 'localizacoes', 'gps', 'live-map', 'rastreamento', 'tracking', 'alertas', 'mensagens', 'checklists', 'ocorrencias', 'despesas', 'sync', 'panico', 'emergencias', 'giroflex', 'watchdog', 'antifraude', 'ai'],
        'MOTORISTA' => ['driver', 'gps', 'trip-passengers'],
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
