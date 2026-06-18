<?php

declare(strict_types=1);

$password = $argv[1] ?? '';
if ($password === '') {
    fwrite(STDERR, "Uso: php scripts/hash-password.php \"sua-senha\"\n");
    exit(1);
}

echo password_hash($password, PASSWORD_DEFAULT) . PHP_EOL;
