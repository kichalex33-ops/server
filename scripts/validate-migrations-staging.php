<?php

declare(strict_types=1);

/**
 * H5.36 - Validador de migrations em staging.
 *
 * Uso recomendado:
 *   php scripts/validate-migrations-staging.php --env=.env.staging
 *
 * Este script foi feito para staging/cópia do banco. Ele recusa APP_ENV=production.
 */

$root = dirname(__DIR__);
$options = parseCliOptions($argv);

if (isset($options['help']) || isset($options['h'])) {
    printHelp();
    exit(0);
}

$migrationsDir = $root . '/db/migrations';
if (!is_dir($migrationsDir)) {
    fwrite(STDERR, "Diretório de migrations não encontrado: {$migrationsDir}\n");
    exit(1);
}

$files = glob($migrationsDir . '/*.sql') ?: [];
sort($files, SORT_STRING);

if (isset($options['only'])) {
    $needle = (string)$options['only'];
    $files = array_values(array_filter($files, static fn(string $file): bool => str_contains(basename($file), $needle)));
}

if (isset($options['file'])) {
    $file = (string)$options['file'];
    if (!str_starts_with($file, DIRECTORY_SEPARATOR)) {
        $file = $root . '/' . ltrim($file, '/');
    }
    $files = [$file];
}

if (isset($options['list'])) {
    foreach ($files as $file) {
        echo basename($file) . PHP_EOL;
    }
    exit(0);
}

$envPath = (string)($options['env'] ?? ($root . '/.env.staging'));
if (!str_starts_with($envPath, DIRECTORY_SEPARATOR)) {
    $envPath = $root . '/' . ltrim($envPath, '/');
}

if (!is_file($envPath)) {
    fwrite(STDERR, "Arquivo de ambiente de staging não encontrado: {$envPath}\n");
    fwrite(STDERR, "Crie a partir de .env.staging.example e aponte para um banco de teste.\n");
    exit(1);
}

loadEnvFile($envPath);

$appEnv = strtolower((string)(getenv('APP_ENV') ?: ''));
$dbName = (string)(getenv('DB_NAME') ?: '');
$dbUser = (string)(getenv('DB_USER') ?: '');
$dbHost = (string)(getenv('DB_HOST') ?: 'localhost');
$dbPort = (int)(getenv('DB_PORT') ?: 3306);
$dbCharset = (string)(getenv('DB_CHARSET') ?: 'utf8mb4');
$dbPassword = (string)(getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: ''));

if ($appEnv === '' || $appEnv === 'production' || $appEnv === 'prod') {
    fwrite(STDERR, "Execução bloqueada: APP_ENV precisa ser staging, homologacao, test, dev ou local. Valor atual: " . ($appEnv ?: '(vazio)') . "\n");
    exit(1);
}

$allowedEnvs = ['staging', 'stage', 'homologacao', 'homologação', 'test', 'testing', 'dev', 'development', 'local'];
if (!in_array($appEnv, $allowedEnvs, true)) {
    fwrite(STDERR, "Execução bloqueada: ambiente não reconhecido como seguro para teste: {$appEnv}\n");
    fwrite(STDERR, "Use APP_ENV=staging em .env.staging.\n");
    exit(1);
}

foreach ([ 'DB_NAME' => $dbName, 'DB_USER' => $dbUser ] as $key => $value) {
    if ($value === '') {
        fwrite(STDERR, "Configuração obrigatória ausente: {$key}\n");
        exit(1);
    }
}

if ($files === []) {
    fwrite(STDERR, "Nenhuma migration encontrada para executar.\n");
    exit(1);
}

$blockedFiles = [];
$skippedFiles = [];
$executableFiles = [];
foreach ($files as $file) {
    $content = (string)file_get_contents($file);
    $basename = basename($file);
    $destructive = preg_match('/\b(TRUNCATE\s+TABLE|DROP\s+TABLE|DROP\s+COLUMN|DROP\s+DATABASE|DELETE\s+FROM)\b/i', $content) === 1;
    $explicitReset = str_contains(strtolower($basename), 'reset') || str_contains(strtolower($content), 'nao rode em producao') || str_contains(strtolower($content), 'não rode em produção');

    if ($destructive && !isset($options['allow-destructive'])) {
        if ($explicitReset) {
            $skippedFiles[] = $basename;
            continue;
        }
        $blockedFiles[] = $basename;
        continue;
    }

    $executableFiles[] = $file;
}

if ($blockedFiles !== []) {
    fwrite(STDERR, "Execução bloqueada: migrations com comandos destrutivos.\n");
    foreach ($blockedFiles as $file) {
        fwrite(STDERR, "- {$file}\n");
    }
    fwrite(STDERR, "Revise os arquivos ou use --allow-destructive apenas em staging descartável.\n");
    exit(1);
}

if ($skippedFiles !== []) {
    echo "Migrations destrutivas de reset ignoradas por segurança:\n";
    foreach ($skippedFiles as $file) {
        echo "- {$file}\n";
    }
    echo "Use --allow-destructive somente em staging descartável.\n\n";
}

$files = $executableFiles;
if ($files === []) {
    fwrite(STDERR, "Nenhuma migration segura restante para executar.\n");
    exit(1);
}

$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $dbHost, $dbPort, $dbName, $dbCharset);

$report = [
    'tool' => 'validate-migrations-staging.php',
    'version' => 'h536',
    'started_at' => date('c'),
    'app_env' => $appEnv,
    'db_host' => $dbHost,
    'db_name' => $dbName,
    'migrations' => [],
    'ok' => false,
];

try {
    $pdo = new PDO($dsn, $dbUser, $dbPassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

    foreach ($files as $file) {
        $basename = basename($file);
        $content = (string)file_get_contents($file);
        $statements = splitSqlStatements($content);
        $entry = [
            'file' => $basename,
            'statements' => count($statements),
            'started_at' => date('c'),
            'ok' => false,
        ];

        echo "Executando {$basename} (" . count($statements) . " comandos) ...\n";
        $index = 0;
        foreach ($statements as $statement) {
            $index++;
            $sql = trim($statement);
            if ($sql === '') {
                continue;
            }
            try {
                $pdo->exec($sql);
            } catch (Throwable $e) {
                $entry['failed_statement'] = $index;
                $entry['error'] = $e->getMessage();
                $entry['sql_preview'] = mb_substr(preg_replace('/\s+/', ' ', $sql) ?: $sql, 0, 240);
                $entry['finished_at'] = date('c');
                $report['migrations'][] = $entry;
                throw new RuntimeException("Falha em {$basename}, comando {$index}: " . $e->getMessage(), 0, $e);
            }
        }

        $entry['ok'] = true;
        $entry['finished_at'] = date('c');
        $report['migrations'][] = $entry;
    }

    $report['ok'] = true;
    $report['finished_at'] = date('c');
    writeReport($root, $report);
    echo "\nAPROVADO: migrations executadas em staging.\n";
    exit(0);
} catch (Throwable $e) {
    $report['ok'] = false;
    $report['finished_at'] = date('c');
    $report['error'] = $e->getMessage();
    writeReport($root, $report);
    fwrite(STDERR, "\nBLOQUEADO: " . $e->getMessage() . "\n");
    exit(1);
}

function parseCliOptions(array $argv): array
{
    $options = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (!str_starts_with($arg, '--')) {
            continue;
        }
        $arg = substr($arg, 2);
        if (str_contains($arg, '=')) {
            [$key, $value] = explode('=', $arg, 2);
            $options[$key] = $value;
        } else {
            $options[$arg] = true;
        }
    }
    return $options;
}

function loadEnvFile(string $path): void
{
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if ($key !== '') {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

function splitSqlStatements(string $sql): array
{
    $sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql) ?? $sql;
    $statements = [];
    $buffer = '';
    $inSingle = false;
    $inDouble = false;
    $inBacktick = false;
    $inLineComment = false;
    $inBlockComment = false;
    $length = strlen($sql);

    for ($i = 0; $i < $length; $i++) {
        $char = $sql[$i];
        $next = $i + 1 < $length ? $sql[$i + 1] : '';

        if ($inLineComment) {
            if ($char === "\n") {
                $inLineComment = false;
                $buffer .= $char;
            }
            continue;
        }

        if ($inBlockComment) {
            if ($char === '*' && $next === '/') {
                $inBlockComment = false;
                $i++;
            }
            continue;
        }

        if (!$inSingle && !$inDouble && !$inBacktick) {
            if ($char === '-' && $next === '-') {
                $inLineComment = true;
                $i++;
                continue;
            }
            if ($char === '#') {
                $inLineComment = true;
                continue;
            }
            if ($char === '/' && $next === '*') {
                $inBlockComment = true;
                $i++;
                continue;
            }
        }

        if ($char === "'" && !$inDouble && !$inBacktick) {
            $escaped = $i > 0 && $sql[$i - 1] === '\\';
            if (!$escaped) {
                $inSingle = !$inSingle;
            }
        } elseif ($char === '"' && !$inSingle && !$inBacktick) {
            $escaped = $i > 0 && $sql[$i - 1] === '\\';
            if (!$escaped) {
                $inDouble = !$inDouble;
            }
        } elseif ($char === '`' && !$inSingle && !$inDouble) {
            $inBacktick = !$inBacktick;
        }

        if ($char === ';' && !$inSingle && !$inDouble && !$inBacktick) {
            $trimmed = trim($buffer);
            if ($trimmed !== '') {
                $statements[] = $trimmed;
            }
            $buffer = '';
            continue;
        }

        $buffer .= $char;
    }

    $trimmed = trim($buffer);
    if ($trimmed !== '') {
        $statements[] = $trimmed;
    }

    return $statements;
}

function writeReport(string $root, array $report): void
{
    $dir = $root . '/storage/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $file = $dir . '/migration-test-' . date('Ymd-His') . '.json';
    @file_put_contents($file, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    echo "Relatório: {$file}\n";
}

function printHelp(): void
{
    echo <<<TXT
H5.36 - Validador de migrations em staging

Uso:
  php scripts/validate-migrations-staging.php --env=.env.staging

Opções:
  --env=ARQUIVO              Caminho do arquivo .env de staging. Padrão: .env.staging
  --list                     Lista migrations encontradas e não conecta no banco.
  --only=TRECHO              Executa apenas arquivos cujo nome contenha o trecho.
  --file=CAMINHO             Executa um único arquivo SQL.
  --allow-destructive        Permite comandos destrutivos em staging descartável.
  --help                     Mostra esta ajuda.

Segurança:
  - Recusa APP_ENV=production/prod.
  - Exige APP_ENV de teste: staging, homologacao, test, dev ou local.
  - Usa .env.staging por padrão, não .env.

TXT;
}
