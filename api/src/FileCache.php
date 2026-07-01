<?php

declare(strict_types=1);

final class FileCache
{
    private string $dir;

    public function __construct(string $dir)
    {
        $this->dir = rtrim($dir, '/');
        if (!is_dir($this->dir)) {
            @mkdir($this->dir, 0775, true);
        }
    }

    public function remember(string $key, int $ttlSeconds, callable $callback): array
    {
        $file = $this->file($key);
        if (is_file($file) && (time() - filemtime($file)) < $ttlSeconds) {
            $raw = file_get_contents($file);
            $cached = is_string($raw) ? json_decode($raw, true) : null;
            if (is_array($cached)) {
                return $cached;
            }
        }
        $data = $callback();
        if (is_array($data)) {
            @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return is_array($data) ? $data : [];
    }

    public function forget(string $key): void
    {
        $file = $this->file($key);
        if (is_file($file)) {
            @unlink($file);
        }
    }

    private function file(string $key): string
    {
        return $this->dir . '/' . preg_replace('/[^a-z0-9_.-]/i', '_', $key) . '.json';
    }
}
