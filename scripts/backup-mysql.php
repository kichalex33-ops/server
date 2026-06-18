<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$config = require $root . '/api/config/env.php';
$db = $config['db'];

foreach (['host', 'name', 'user'] as $key) {
    if (($db[$key] ?? '') === '') {
        fwrite(STDERR, "Configuração DB_{$key} ausente.\n");
        exit(1);
    }
}

$backupDir = $config['paths']['backups'];
if (!is_dir($backupDir) && !mkdir($backupDir, 0775, true) && !is_dir($backupDir)) {
    fwrite(STDERR, "Não foi possível criar {$backupDir}.\n");
    exit(1);
}

$file = $backupDir . '/mysql-' . date('Ymd-His') . '.sql';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset']);
$pdo = new PDO($dsn, $db['user'], $db['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$out = fopen($file, 'wb');
fwrite($out, "SET FOREIGN_KEY_CHECKS=0;\n");

foreach ($tables as $table) {
    $create = $pdo->query('SHOW CREATE TABLE `' . str_replace('`', '``', $table) . '`')->fetch(PDO::FETCH_ASSOC);
    fwrite($out, "\nDROP TABLE IF EXISTS `{$table}`;\n");
    fwrite($out, $create['Create Table'] . ";\n");

    $rows = $pdo->query('SELECT * FROM `' . str_replace('`', '``', $table) . '`');
    while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
        $columns = array_map(fn($column) => '`' . str_replace('`', '``', $column) . '`', array_keys($row));
        $values = array_map(fn($value) => $value === null ? 'NULL' : $pdo->quote((string) $value), array_values($row));
        fwrite($out, 'INSERT INTO `' . $table . '` (' . implode(',', $columns) . ') VALUES (' . implode(',', $values) . ");\n");
    }
}

fwrite($out, "\nSET FOREIGN_KEY_CHECKS=1;\n");
fclose($out);

echo $file . PHP_EOL;
