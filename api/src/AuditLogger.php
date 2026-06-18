<?php

declare(strict_types=1);

final class AuditLogger
{
    private Database $db;
    private array $config;

    public function __construct(Database $db, array $config)
    {
        $this->db = $db;
        $this->config = $config;
    }

    public function record(string $action, ?string $entity = null, ?string $entityId = null, ?array $user = null, array $metadata = []): void
    {
        try {
            $this->db->execute(
                'INSERT INTO audit_logs (usuario_id, usuario_nome, perfil, ip, user_agent, acao, entidade, entidade_id, metodo, rota, metadados, criado_em) VALUES (:usuario_id, :usuario_nome, :perfil, :ip, :user_agent, :acao, :entidade, :entidade_id, :metodo, :rota, :metadados, NOW())',
                [
                    'usuario_id' => $user['id'] ?? null,
                    'usuario_nome' => $user['nome'] ?? $user['login'] ?? null,
                    'perfil' => $user['perfil'] ?? null,
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
                    'acao' => $action,
                    'entidade' => $entity,
                    'entidade_id' => $entityId,
                    'metodo' => $_SERVER['REQUEST_METHOD'] ?? null,
                    'rota' => $_SERVER['REQUEST_URI'] ?? null,
                    'metadados' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ]
            );
        } catch (Throwable $error) {
            $this->file('audit_error', $error->getMessage());
        }
    }

    public function failure(string $action, ?string $entity, ?string $entityId): void
    {
        $this->record($action, $entity, $entityId, null);
    }

    public function operational(string $level, string $message, array $metadata = []): void
    {
        try {
            $this->db->execute(
                'INSERT INTO operational_logs (nivel, mensagem, ip, rota, metadados, criado_em) VALUES (:nivel, :mensagem, :ip, :rota, :metadados, NOW())',
                [
                    'nivel' => $level,
                    'mensagem' => $message,
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'rota' => $_SERVER['REQUEST_URI'] ?? null,
                    'metadados' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ]
            );
        } catch (Throwable $error) {
            $this->file($level, $message . ' ' . $error->getMessage());
        }
    }

    private function file(string $level, string $message): void
    {
        $dir = $this->config['paths']['logs'];
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        @file_put_contents($dir . '/api.log', '[' . date('c') . "] {$level} {$message}\n", FILE_APPEND);
    }
}
