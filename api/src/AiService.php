<?php

declare(strict_types=1);

final class AiService
{
    private Database $db;
    private array $config;
    private AuditLogger $audit;

    public function __construct(Database $db, array $config, AuditLogger $audit)
    {
        $this->db = $db;
        $this->config = $config['ai'] ?? [];
        $this->audit = $audit;
    }

    public function status(): array
    {
        return [
            'provider' => $this->config['provider'] ?? 'gemini',
            'model' => $this->config['model'] ?? 'gemini-flash-latest',
            'model_recomendado' => 'gemini-flash-latest',
            'configured' => $this->isConfigured(),
        ];
    }


    public function chat(array $body, ?array $user = null): array
    {
        $latitude = isset($body['latitude']) ? (float) $body['latitude'] : null;
        $longitude = isset($body['longitude']) ? (float) $body['longitude'] : null;
        $mode = trim((string) ($body['modo'] ?? $body['mode'] ?? 'pergunta_livre'));
        $context = [
            'modo_solicitado' => $mode,
            'indicadores' => $this->operationalIndicators(),
            'clima_operador' => $this->weatherContext($latitude, $longitude),
            'sinais_de_rota' => $this->routeSignals(),
            'viagens_hoje' => $this->db->fetchAll(
                "SELECT v.id, v.codigo, v.origem, v.destino, v.status, v.prioridade, v.data_viagem, v.hora_saida, v.hora_retorno, v.motorista_id, m.nome AS motorista, ve.placa, ve.prefixo
                FROM viagens v
                LEFT JOIN motoristas m ON m.id = v.motorista_id
                LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
                WHERE DATE(v.data_viagem) = CURDATE()
                ORDER BY COALESCE(v.hora_saida, '23:59:59') ASC, v.atualizado_em DESC
                LIMIT 80"
            ),
            'viagens_recentes' => $this->db->fetchAll(
                "SELECT v.id, v.codigo, v.origem, v.destino, v.status, v.prioridade, v.data_viagem, v.hora_saida, v.hora_retorno, v.motorista_id, m.nome AS motorista, ve.placa, ve.prefixo
                FROM viagens v
                LEFT JOIN motoristas m ON m.id = v.motorista_id
                LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
                ORDER BY v.atualizado_em DESC
                LIMIT 60"
            ),
            'motoristas' => $this->db->fetchAll('SELECT id, nome, status, atualizado_em FROM motoristas ORDER BY atualizado_em DESC LIMIT 80'),
            'veiculos' => $this->db->fetchAll('SELECT id, prefixo, placa, status, atualizado_em FROM veiculos ORDER BY atualizado_em DESC LIMIT 80'),
            'alertas_abertos' => $this->db->fetchAll(
                "SELECT tipo, descricao, status, criado_em FROM alertas WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO') ORDER BY criado_em DESC LIMIT 30"
            ),
            'ocorrencias_abertas' => $this->db->fetchAll(
                "SELECT viagem_id, tipo, descricao, status, criado_em FROM ocorrencias WHERE UPPER(status) NOT IN ('FECHADA','RESOLVIDA','CANCELADA') ORDER BY criado_em DESC LIMIT 30"
            ),
        ];
        if (!empty($body['viagem_id'])) {
            $context['viagem_selecionada'] = $this->db->fetch('SELECT * FROM viagens WHERE id = :id LIMIT 1', ['id' => (string) $body['viagem_id']]);
        }
        $instruction = 'Atue como assistente operacional da plataforma logística municipal. Responda em português claro, de forma objetiva e útil para gestor/operador. Use somente os dados recebidos. Gere estatísticas, riscos, previsao do tempo operacional, lentidão inferida por GPS/velocidade, pendências e próximas ações quando solicitado. Não invente congestionamento em tempo real; se não houver API de trânsito, deixe claro que a lentidão é inferida pelos sinais de GPS.';
        return $this->generate('chat', $instruction, $context, $body, $user);
    }

    public function operationalSummary(array $body, ?array $user = null): array
    {
        $context = [
            'indicadores' => $this->operationalIndicators(),
            'viagens_ativas' => $this->db->fetchAll(
                "SELECT id, codigo, origem, destino, motorista_id, veiculo_id, status, prioridade, atualizado_em
                FROM viagens
                WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')
                ORDER BY atualizado_em DESC
                LIMIT 25"
            ),
            'ultimas_localizacoes' => $this->db->fetchAll(
                'SELECT viagem_id, veiculo_id, motorista_id, latitude, longitude, velocidade, criado_em
                FROM localizacoes
                ORDER BY criado_em DESC
                LIMIT 25'
            ),
            'alertas' => $this->db->fetchAll(
                "SELECT tipo, descricao, status, criado_em
                FROM alertas
                WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO')
                ORDER BY criado_em DESC
                LIMIT 20"
            ),
            'ocorrencias' => $this->db->fetchAll(
                "SELECT viagem_id, tipo, descricao, status, criado_em
                FROM ocorrencias
                WHERE UPPER(status) NOT IN ('FECHADA','RESOLVIDA','CANCELADA')
                ORDER BY criado_em DESC
                LIMIT 20"
            ),
        ];

        $instruction = 'Gere um resumo operacional curto para a sala de situacao. Destaque riscos, veiculos sem GPS recente, alertas e proximas acoes. Nao invente dados. Se faltar dado, informe que falta.';
        return $this->generate('operational_summary', $instruction, $context, $body, $user);
    }

    public function managerReport(array $body, ?array $user = null): array
    {
        $context = [
            'indicadores' => $this->operationalIndicators(),
            'motoristas' => $this->db->fetchAll('SELECT id, nome, status, atualizado_em FROM motoristas ORDER BY atualizado_em DESC LIMIT 50'),
            'veiculos' => $this->db->fetchAll('SELECT id, prefixo, placa, status, km_rodados, atualizado_em FROM veiculos ORDER BY atualizado_em DESC LIMIT 50'),
            'viagens' => $this->db->fetchAll('SELECT id, codigo, origem, destino, status, prioridade, data_viagem, atualizado_em FROM viagens ORDER BY atualizado_em DESC LIMIT 50'),
            'auditoria' => $this->db->fetchAll('SELECT acao, entidade, entidade_id, criado_em FROM audit_logs ORDER BY criado_em DESC LIMIT 25'),
        ];

        $instruction = 'Gere um relatorio gerencial objetivo para o gestor. Use somente os dados recebidos. Separe em situacao atual, pontos de atencao e pendencias para homologacao/operacao.';
        return $this->generate('manager_report', $instruction, $context, $body, $user);
    }


    public function statistics(array $body, ?array $user = null): array
    {
        $context = [
            'indicadores' => $this->operationalIndicators(),
            'viagens_por_status' => $this->db->fetchAll('SELECT status, COUNT(*) AS total FROM viagens GROUP BY status ORDER BY total DESC'),
            'viagens_por_prioridade' => $this->db->fetchAll('SELECT prioridade, COUNT(*) AS total FROM viagens GROUP BY prioridade ORDER BY total DESC'),
            'viagens_por_dia' => $this->db->fetchAll('SELECT data_viagem, COUNT(*) AS total FROM viagens WHERE data_viagem IS NOT NULL GROUP BY data_viagem ORDER BY data_viagem DESC LIMIT 14'),
            'motoristas_por_status' => $this->db->fetchAll('SELECT status, COUNT(*) AS total FROM motoristas GROUP BY status ORDER BY total DESC'),
            'veiculos_por_status' => $this->db->fetchAll('SELECT status, COUNT(*) AS total FROM veiculos GROUP BY status ORDER BY total DESC'),
            'alertas_por_tipo' => $this->db->fetchAll('SELECT tipo, COUNT(*) AS total FROM alertas GROUP BY tipo ORDER BY total DESC LIMIT 20'),
        ];
        $instruction = 'Gere estatisticas executivas da operacao logistica. Traga numeros, tendencias observadas, gargalos e proximas acoes. Use apenas os dados recebidos e diga quando a base ainda estiver pequena.';
        return $this->generate('statistics', $instruction, $context, $body, $user);
    }

    public function routeIntelligence(array $body, ?array $user = null): array
    {
        $latitude = isset($body['latitude']) ? (float) $body['latitude'] : null;
        $longitude = isset($body['longitude']) ? (float) $body['longitude'] : null;
        $context = [
            'indicadores' => $this->operationalIndicators(),
            'clima_operador' => $this->weatherContext($latitude, $longitude),
            'sinais_de_rota' => $this->routeSignals(),
            'viagens_ativas' => $this->db->fetchAll(
                "SELECT v.id, v.codigo, v.origem, v.destino, v.status, v.prioridade, v.data_viagem, v.hora_saida, v.hora_retorno, v.motorista_id, m.nome AS motorista, ve.placa, ve.prefixo
                FROM viagens v
                LEFT JOIN motoristas m ON m.id = v.motorista_id
                LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
                WHERE UPPER(v.status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')
                ORDER BY v.atualizado_em DESC
                LIMIT 50"
            ),
            'alertas_abertos' => $this->db->fetchAll(
                "SELECT tipo, descricao, status, criado_em FROM alertas WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO') ORDER BY criado_em DESC LIMIT 20"
            ),
        ];
        $instruction = 'Analise rotas e deslocamentos dos motoristas. Considere clima, ultimos sinais de GPS, velocidade baixa como possivel lentidao, falta de GPS como risco operacional e origem/destino das viagens. Nao invente trafego em tempo real; se nao houver fonte externa de transito, explique que a lentidao foi inferida por GPS/velocidade.';
        return $this->generate('route_intelligence', $instruction, $context, $body, $user);
    }

    public function tripAnalysis(array $body, ?array $user = null): array
    {
        $tripId = trim((string) ($body['viagem_id'] ?? $body['viagemId'] ?? $body['id'] ?? ''));
        if ($tripId === '') {
            throw new RuntimeException('viagem_id e obrigatorio.');
        }

        $context = [
            'viagem' => $this->db->fetch('SELECT * FROM viagens WHERE id = :id LIMIT 1', ['id' => $tripId]),
            'passageiros' => $this->db->fetchAll('SELECT id, nome, tipo, status, criado_em, atualizado_em FROM passageiros WHERE viagem_id = :viagem_id ORDER BY criado_em ASC', ['viagem_id' => $tripId]),
            'localizacoes' => $this->db->fetchAll('SELECT latitude, longitude, velocidade, criado_em FROM localizacoes WHERE viagem_id = :viagem_id ORDER BY criado_em DESC LIMIT 30', ['viagem_id' => $tripId]),
            'eventos' => $this->db->fetchAll('SELECT tipo, descricao, data_hora FROM eventos WHERE viagem_id = :viagem_id ORDER BY data_hora DESC LIMIT 30', ['viagem_id' => $tripId]),
            'ocorrencias' => $this->db->fetchAll('SELECT tipo, descricao, status, criado_em FROM ocorrencias WHERE viagem_id = :viagem_id ORDER BY criado_em DESC LIMIT 30', ['viagem_id' => $tripId]),
        ];
        if (!$context['viagem']) {
            throw new RuntimeException('Viagem nao encontrada.');
        }

        $instruction = 'Analise esta viagem para apoio operacional. Resuma andamento, possiveis riscos, status de passageiros, GPS e proximas acoes. Nao altere regra de negocio e nao invente dados.';
        return $this->generate('trip_analysis', $instruction, $context, $body, $user);
    }

    private function operationalIndicators(): array
    {
        return [
            'viagens_ativas' => $this->scalar("SELECT COUNT(*) FROM viagens WHERE UPPER(status) NOT IN ('CONCLUIDA','FINALIZADA','CANCELADA')"),
            'motoristas_ativos' => $this->scalar("SELECT COUNT(*) FROM motoristas WHERE status IN ('ativo','online','em_operacao')"),
            'veiculos_operacionais' => $this->scalar("SELECT COUNT(*) FROM veiculos WHERE status IN ('ativo','operacional','online')"),
            'alertas_abertos' => $this->scalar("SELECT COUNT(*) FROM alertas WHERE UPPER(status) NOT IN ('FECHADO','RESOLVIDO','CANCELADO')"),
            'ocorrencias_abertas' => $this->scalar("SELECT COUNT(*) FROM ocorrencias WHERE UPPER(status) NOT IN ('FECHADA','RESOLVIDA','CANCELADA')"),
            'gps_ultimos_10_minutos' => $this->scalar('SELECT COUNT(*) FROM localizacoes WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)'),
        ];
    }


    private function weatherContext(?float $latitude, ?float $longitude): array
    {
        $lat = $latitude ?? -29.5419;
        $lon = $longitude ?? -51.4828;
        $context = [
            'latitude' => $lat,
            'longitude' => $lon,
            'fonte' => 'Open-Meteo',
            'observacao' => $latitude === null || $longitude === null ? 'Usando centro operacional padrao porque o navegador nao enviou localizacao do operador.' : 'Usando localizacao informada pelo navegador do operador.',
        ];
        if (!function_exists('curl_init')) {
            $context['erro'] = 'Extensao cURL indisponivel para consultar previsao do tempo.';
            return $context;
        }
        $query = http_build_query([
            'latitude' => $lat,
            'longitude' => $lon,
            'current' => 'temperature_2m,precipitation,rain,weather_code,wind_speed_10m',
            'hourly' => 'temperature_2m,precipitation_probability,rain,weather_code,wind_speed_10m',
            'forecast_days' => 1,
            'timezone' => 'auto',
        ]);
        $ch = curl_init('https://api.open-meteo.com/v1/forecast?' . $query);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($response === false || $status < 200 || $status >= 300) {
            $context['erro'] = $error ?: ('HTTP ' . $status);
            return $context;
        }
        $json = json_decode((string) $response, true);
        if (!is_array($json)) {
            $context['erro'] = 'Resposta de clima invalida.';
            return $context;
        }
        $context['current'] = $json['current'] ?? null;
        $context['hourly_units'] = $json['hourly_units'] ?? null;
        $context['proximas_horas'] = [];
        $times = $json['hourly']['time'] ?? [];
        for ($i = 0; $i < min(8, count($times)); $i++) {
            $context['proximas_horas'][] = [
                'hora' => $times[$i] ?? null,
                'temperatura' => $json['hourly']['temperature_2m'][$i] ?? null,
                'probabilidade_chuva' => $json['hourly']['precipitation_probability'][$i] ?? null,
                'chuva_mm' => $json['hourly']['rain'][$i] ?? null,
                'vento_kmh' => $json['hourly']['wind_speed_10m'][$i] ?? null,
                'codigo_tempo' => $json['hourly']['weather_code'][$i] ?? null,
            ];
        }
        return $context;
    }

    private function routeSignals(): array
    {
        $locations = $this->db->fetchAll(
            'SELECT l.*
            FROM localizacoes l
            INNER JOIN (
                SELECT COALESCE(viagem_id, CONCAT("motorista:", motorista_id), CONCAT("veiculo:", veiculo_id), id) AS ref, MAX(criado_em) AS ultimo
                FROM localizacoes
                GROUP BY ref
            ) x ON x.ultimo = l.criado_em
            ORDER BY l.criado_em DESC
            LIMIT 80'
        );
        $signals = [];
        foreach ($locations as $loc) {
            $speed = is_numeric($loc['velocidade'] ?? null) ? (float) $loc['velocidade'] : null;
            $created = strtotime((string) ($loc['criado_em'] ?? '')) ?: null;
            $ageMinutes = $created ? (int) floor((time() - $created) / 60) : null;
            $level = 'normal';
            $reason = 'Sem sinal critico.';
            if ($ageMinutes !== null && $ageMinutes > 20) {
                $level = 'sem_gps_recente';
                $reason = 'Ultimo GPS acima de 20 minutos.';
            } elseif ($speed !== null && $speed <= 8) {
                $level = 'parado_ou_muito_lento';
                $reason = 'Velocidade muito baixa detectada pelo GPS.';
            } elseif ($speed !== null && $speed <= 20) {
                $level = 'lentidao';
                $reason = 'Velocidade baixa detectada pelo GPS.';
            }
            $signals[] = [
                'viagem_id' => $loc['viagem_id'] ?? null,
                'motorista_id' => $loc['motorista_id'] ?? null,
                'veiculo_id' => $loc['veiculo_id'] ?? null,
                'latitude' => $loc['latitude'] ?? null,
                'longitude' => $loc['longitude'] ?? null,
                'velocidade' => $speed,
                'idade_minutos' => $ageMinutes,
                'classificacao' => $level,
                'motivo' => $reason,
                'criado_em' => $loc['criado_em'] ?? null,
            ];
        }
        return $signals;
    }

    private function generate(string $type, string $instruction, array $context, array $body, ?array $user): array
    {
        $this->assertConfigured();
        $prompt = [
            'instrucao' => $instruction,
            'tipo' => $type,
            'pergunta_operador' => $body['pergunta'] ?? $body['prompt'] ?? null,
            'contexto' => $context,
        ];
        $text = $this->callGemini($prompt);
        $this->audit->record('ai_' . $type, 'ai', $type, $user, ['provider' => $this->config['provider'] ?? 'gemini']);
        return [
            'provider' => $this->config['provider'] ?? 'gemini',
            'model' => $this->config['model'] ?? null,
            'type' => $type,
            'resposta' => $text,
            'gerado_em' => date('c'),
        ];
    }

    private function callGemini(array $prompt): string
    {
        $apiKey = (string) ($this->config['api_key'] ?? '');
        $timeout = max(5, (int) ($this->config['timeout_seconds'] ?? 20));

        if (!function_exists('curl_init')) {
            throw new RuntimeException('Extensao cURL nao disponivel para chamar a IA.');
        }

        $errors = [];
        foreach ($this->geminiModelCandidates() as $model) {
            try {
                return $this->callGeminiModel($model, $prompt, $apiKey, $timeout);
            } catch (RuntimeException $exception) {
                $errors[] = $model . ': ' . $exception->getMessage();
            }
        }

        throw new RuntimeException('Falha ao chamar IA Gemini em todos os modelos testados. ' . implode(' | ', $errors));
    }

    private function geminiModelCandidates(): array
    {
        $configured = trim((string) ($this->config['model'] ?? ''));
        $candidates = [];
        if ($configured !== '') {
            $candidates[] = $configured;
        }

        // gemini-1.5-flash retornou "not found" em contas recentes. Usar alias atual evita quebrar a plataforma quando o Google troca modelos.
        foreach (['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'] as $fallback) {
            $candidates[] = $fallback;
        }

        return array_values(array_unique(array_filter($candidates)));
    }

    private function callGeminiModel(string $model, array $prompt, string $apiKey, int $timeout): string
    {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($apiKey);
        $payload = json_encode([
            'contents' => [[
                'role' => 'user',
                'parts' => [['text' => json_encode($prompt, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]],
            ]],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 900,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => $timeout,
        ]);
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $status < 200 || $status >= 300) {
            $googleMessage = '';
            if (is_string($response) && trim($response) !== '') {
                $json = json_decode($response, true);
                if (is_array($json)) {
                    $googleMessage = (string) ($json['error']['message'] ?? '');
                }
            }
            throw new RuntimeException(trim(($error ?: 'HTTP ' . $status) . ($googleMessage !== '' ? ' - ' . $googleMessage : '')));
        }

        $json = json_decode((string) $response, true);
        $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!is_string($text) || trim($text) === '') {
            throw new RuntimeException('IA retornou resposta vazia.');
        }
        return trim($text);
    }

    private function isConfigured(): bool
    {
        return trim((string) ($this->config['api_key'] ?? '')) !== '';
    }

    private function assertConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('IA nao configurada. Defina GEMINI_API_KEY no .env do servidor.');
        }
        if (($this->config['provider'] ?? 'gemini') !== 'gemini') {
            throw new RuntimeException('Provedor de IA nao suportado nesta fase.');
        }
    }

    private function scalar(string $sql): int
    {
        $row = $this->db->fetch('SELECT (' . $sql . ') AS valor');
        return (int) ($row['valor'] ?? 0);
    }
}
