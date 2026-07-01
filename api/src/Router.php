<?php

declare(strict_types=1);

final class Router
{
    /** @var array<string, callable> */
    private array $exact = [];

    /** @var array<int, array{method:string, pattern:string, regex:string, handler:callable}> */
    private array $dynamic = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    public function patch(string $pattern, callable $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function add(string $method, string $pattern, callable $handler): void
    {
        $method = strtoupper(trim($method));
        $pattern = $this->normalizePath($pattern);
        if (strpos($pattern, '{') === false) {
            $this->exact[$method . ' ' . $pattern] = $handler;
            return;
        }

        $quoted = preg_quote($pattern, '#');
        $regex = preg_replace('/\\\{[a-zA-Z_][a-zA-Z0-9_]*\\\}/', '([^/]+)', $quoted);
        if (!is_string($regex)) {
            throw new RuntimeException('Falha ao compilar rota dinâmica.');
        }
        $this->dynamic[] = [
            'method' => $method,
            'pattern' => $pattern,
            'regex' => '#^' . $regex . '$#',
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $path): bool
    {
        $method = strtoupper(trim($method));
        $path = $this->normalizePath($path);
        $key = $method . ' ' . $path;

        if (isset($this->exact[$key])) {
            ($this->exact[$key])();
            return true;
        }

        foreach ($this->dynamic as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            if (!preg_match($route['regex'], $path, $matches)) {
                continue;
            }
            array_shift($matches);
            $params = array_map('rawurldecode', $matches);
            ($route['handler'])(...$params);
            return true;
        }

        return false;
    }

    private function normalizePath(string $path): string
    {
        $path = '/' . trim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }
}
