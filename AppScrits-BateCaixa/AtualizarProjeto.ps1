# Configurações
$SCRIPT_ID = "1AOpG3esUeKKDOcj_IHgAPddVF-LeLwmpUkTwNN1vl_dHfkXPLP7vIdhk"
$NOME_FINAL = "AppScript-TESTES-BateCaixa.txt"

Write-Host "--- [IntérpretePro] Iniciando Sincronização e Backup ---" -ForegroundColor Yellow

# 1. Limpeza Preventiva
# Deleta arquivos antigos para evitar conflitos, mas preserva este script e o executável
Get-ChildItem -Exclude "AtualizarProjeto.ps1", "clicar_aqui.bat" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 2. Download do Código (Clasp Clone)
Write-Host "Baixando arquivos do Google Apps Script..." -ForegroundColor Cyan
clasp clone $SCRIPT_ID

# 3. Unificação (Gerar TXT Único)
Write-Host "Empacotando código em $NOME_FINAL..." -ForegroundColor Cyan
Remove-Item $NOME_FINAL -ErrorAction SilentlyContinue

# Varredura e concatenação
Get-ChildItem -Recurse | Where-Object { $_.Extension -match "\.(js|html|gs|json)$" -and $_.Name -ne "appsscript.json" } | ForEach-Object {
    $header = "`n`n/* ==================================================================================`n   ARQUIVO: $($_.Name)`n================================================================================== */`n"
    Add-Content -Path $NOME_FINAL -Value $header
    Get-Content $_.FullName | Add-Content -Path $NOME_FINAL
}

# Adiciona o appsscript.json por último para organização
if (Test-Path "appsscript.json") {
    $headerjson = "`n`n/* ==================================================================================`n   ARQUIVO: appsscript.json`n================================================================================== */`n"
    Add-Content -Path $NOME_FINAL -Value $headerjson
    Get-Content "appsscript.json" | Add-Content -Path $NOME_FINAL
}

Write-Host "✅ SUCESSO! Código atualizado e unificado em $NOME_FINAL" -ForegroundColor Green
Write-Host "Pressione qualquer tecla para fechar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")