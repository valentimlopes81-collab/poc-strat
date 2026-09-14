@echo off
REM StockVal - correr localmente no teu PC (Windows).
REM 1a vez: cria o ambiente e instala tudo. Depois e so duplo-clique.
cd /d "%~dp0"

REM Cria o ambiente virtual + dependencias so na 1a vez.
if not exist .venv (
  echo A preparar o StockVal (so acontece na 1a vez)...
  python -m venv .venv
  call .venv\Scripts\pip.exe install -q --upgrade pip
  call .venv\Scripts\pip.exe install -q -r requirements.txt
)

echo.
echo   StockVal a correr em:  http://127.0.0.1:8001
echo   (deixa esta janela aberta; Ctrl+C para parar)
echo.

start "" http://127.0.0.1:8001
.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001
