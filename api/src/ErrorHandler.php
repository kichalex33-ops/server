<?php

declare(strict_types=1);

final class ErrorHandler
{
    public static function register(array $config): void
    {
        set_exception_handler(function (Throwable $error) use ($config): void {
            self::handle($error, $config);
        });
    }

    public static function handle(Throwable $error, array $config): void
    {
        $logger = new StructuredLogger((string) ($config['paths']['logs'] ?? dirname(__DIR__, 2) . '/storage/logs'));
        $status = self::statusCode($error);
        $safeMessage = self::safeMessage($error, $status, (string) ($config['app_env'] ?? 'production'));

        $logger->error('api_exception', [
            'status' => $status,
            'class' => get_class($error),
            'message' => $error->getMessage(),
            'file' => $error->getFile(),
            'line' => $error->getLine(),
        ]);

        Response::error($safeMessage, $status, ['request_id' => StructuredLogger::requestId()]);
    }

    private static function statusCode(Throwable $error): int
    {
        if ($error instanceof InvalidArgumentException) {
            return 422;
        }
        if ($error instanceof DomainException) {
            return 403;
        }
        if ($error instanceof PDOException) {
            return 500;
        }
        $message = $error->getMessage();
        if (preg_match('/(muitas tentativas|rate limit|aguarde)/i', $message)) {
            return 429;
        }
        if (preg_match('/(credenciais|login inv|token inv|token expir|token obrig|refresh token inv|qr code expir|token revogado|senha local)/i', $message)) {
            return 401;
        }
        if (preg_match('/(obrigat[oó]rio|inv[aá]lid|malformad|payload|schema|campo)/i', $message)) {
            return 422;
        }
        return 400;
    }

    private static function safeMessage(Throwable $error, int $status, string $env): string
    {
        $debug = in_array(strtolower($env), ['local', 'development', 'dev', 'debug'], true);
        if ($debug) {
            return $error->getMessage();
        }
        if ($status === 401) {
            return 'Autenticação inválida ou expirada.';
        }
        if ($status === 403) {
            return 'Acesso negado.';
        }
        if ($status === 422 && $error instanceof InvalidArgumentException) {
            return $error->getMessage();
        }
        if ($status === 429) {
            return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        }
        if ($status >= 500) {
            return 'Erro interno. Informe o suporte com o request_id.';
        }
        return 'Requisição inválida.';
    }
}
