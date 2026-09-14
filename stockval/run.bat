@echo off
REM StockVal - correr localmente no teu PC (Windows).
REM 1a vez: cria o ambiente e instala tudo. Depois e so duplo-clique.
cd /d "%~dp0"

if not exist .venv call :setup

echo.
echo   StockVal a correr em:  http://127.0.0.1:8001
echo   Deixa esta janela aberta. Ctrl+C para parar.
echo.
start "" http://127.0.0.1:8001
.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001
goto :eof

:setup
echo A preparar o StockVal. So acontece na 1a vez. Aguarda...
python -m venv .venv
call .venv\Scripts\pip.exe install --upgrade pip
call .venv\Scripts\pip.exe install -r requirements.txt
goto :eof
