#!/usr/bin/env bash
# StockVal — correr localmente no teu PC (Mac/Linux).
# 1ª vez: cria o ambiente e instala tudo. Depois é só abrir.
# Uso:  ./run.sh          (ou duplo-clique se o deres como executável)
set -e
cd "$(dirname "$0")"

# Escolhe o Python disponível.
PY="$(command -v python3 || command -v python || true)"
if [ -z "$PY" ]; then
  echo "Precisas de ter o Python instalado (python.org)."; exit 1
fi

# Cria o ambiente virtual + dependências só na 1ª vez.
if [ ! -d .venv ]; then
  echo "A preparar o StockVal (só acontece na 1ª vez)..."
  "$PY" -m venv .venv
  ./.venv/bin/pip install -q --upgrade pip
  ./.venv/bin/pip install -q -r requirements.txt
fi

echo ""
echo "  StockVal a correr em:  http://127.0.0.1:8001"
echo "  (deixa esta janela aberta; Ctrl+C para parar)"
echo ""

# Abre o browser passado 1-2s (em segundo plano).
( sleep 2; "$PY" -c "import webbrowser; webbrowser.open('http://127.0.0.1:8001')" >/dev/null 2>&1 || true ) &

exec ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
