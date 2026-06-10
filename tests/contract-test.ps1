$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$project = Join-Path $root 'painel-logistico'

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-FileContains {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Message
    )

    Assert-True (Test-Path -LiteralPath $Path) "Arquivo ausente: $Path"
    $content = Get-Content -LiteralPath $Path -Raw
    Assert-True ($content -match $Pattern) $Message
}

$requiredPaths = @(
    'public_html/index.php',
    'public_html/.htaccess',
    'public_html/assets/css/style.css',
    'public_html/assets/js/app.js',
    'public_html/assets/img/brasao-sao-jose-do-sul.png',
    'public_html/assets/img/andrade-gestao-saude.jpeg',
    'api/index.php',
    'api/routes.php',
    'api/controllers/DashboardController.php',
    'api/controllers/TravelController.php',
    'api/controllers/DriverController.php',
    'api/controllers/VehicleController.php',
    'api/controllers/PatientController.php',
    'api/controllers/PassengerController.php',
    'api/controllers/EventController.php',
    'api/controllers/LocationController.php',
    'api/controllers/MessageController.php',
    'api/controllers/AlertController.php',
    'api/controllers/ChecklistController.php',
    'config/database.php',
    'src/Database.php',
    'src/Response.php',
    'src/Auth.php',
    'src/Repositories/BaseRepository.php',
    'database/schema.sql',
    'database/seed.sql',
    '.env.example',
    'README.md'
)

foreach ($relative in $requiredPaths) {
    Assert-True (Test-Path -LiteralPath (Join-Path $project $relative)) "Caminho obrigatório ausente: $relative"
}

$schemaPath = Join-Path $project 'database/schema.sql'
$tables = @(
    'usuarios',
    'motoristas',
    'veiculos',
    'pacientes',
    'viagens',
    'passageiros',
    'viagem_eventos',
    'viagem_mensagens',
    'viagem_alertas',
    'checklists',
    'checklist_itens',
    'localizacoes',
    'sync_logs'
)

foreach ($table in $tables) {
    Assert-FileContains $schemaPath "CREATE TABLE IF NOT EXISTS ``?$table``?" "Tabela não encontrada no schema: $table"
}

$seedPath = Join-Path $project 'database/seed.sql'
foreach ($seedValue in @('Jo', 'Van Sa', 'LOG-2045', 'Maria da Silva', 'Ana Souza', 'Jos', 'Pedro Souza', 'Hospital Montenegro')) {
    Assert-FileContains $seedPath ([regex]::Escape($seedValue)) "Seed esperado ausente: $seedValue"
}

$jsPath = Join-Path $project 'public_html/assets/js/app.js'
foreach ($endpoint in @('/api/dashboard/resumo-dia', '/api/viagens', '/api/alertas')) {
    Assert-FileContains $jsPath ([regex]::Escape($endpoint)) "Frontend não referencia endpoint: $endpoint"
}
Assert-FileContains $jsPath 'fallback' 'Frontend precisa deixar claro o uso de fallback demonstrativo.'

$indexPath = Join-Path $project 'public_html/index.php'
Assert-FileContains $indexPath 'assets/css/style.css' 'index.php precisa apontar para CSS reaproveitado.'
Assert-FileContains $indexPath 'assets/js/app.js' 'index.php precisa apontar para JS reaproveitado.'
Assert-FileContains $indexPath 'Painel Log' 'Página inicial precisa preservar o nome Painel Logístico.'
Assert-FileContains $indexPath 'Andrade Gest' 'Página inicial precisa preservar Andrade Gestão em Saúde.'

$routesPath = Join-Path $project 'api/routes.php'
foreach ($route in @(
    'GET /api/status',
    'GET /api/dashboard/resumo-dia',
    'GET /api/viagens',
    'GET /api/motoristas',
    'GET /api/veiculos',
    'GET /api/pacientes',
    'GET /api/alertas'
)) {
    Assert-FileContains $routesPath ([regex]::Escape($route)) "Rota documentada/registrada ausente: $route"
}

$allText = Get-ChildItem -LiteralPath $project -Recurse -File |
    Where-Object { $_.Extension -in @('.php', '.js', '.css', '.md', '.sql', '.example', '') } |
    ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }

Assert-True (-not (($allText -join "`n") -match '(?i)\bACE\b|endemia')) 'Termo proibido encontrado: ACE/endemia.'

Write-Host 'Contrato da plataforma validado com sucesso.'
