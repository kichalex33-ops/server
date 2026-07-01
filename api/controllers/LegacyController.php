<?php

declare(strict_types=1);

final class LegacyController extends BaseController
{
    public function respond(array $data = [], int $status = 200): void
    {
        $this->ok($data, $status);
    }

    public function respondCsv(string $filename, array $rows): void
    {
        $this->csv($filename, $rows);
    }

    public function scoped(array $body): array
    {
        return $this->driverScopedBody($body);
    }
}
