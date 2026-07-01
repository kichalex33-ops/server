<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/Database.php';

$config = require dirname(__DIR__) . '/config/env.php';
$db = new Database($config);
$deleted = $db->execute('DELETE FROM jwt_blacklist WHERE expires_at < NOW()');
echo '[' . date('c') . '] jwt_blacklist deleted=' . $deleted . PHP_EOL;
