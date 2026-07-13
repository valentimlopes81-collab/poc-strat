# POC Strat — Paper Trading automático + Dashboard

Executa automaticamente, em **paper trading**, a estratégia de divergências +
zonas de POC, e mostra tudo num dashboard web para fazeres *live backtest*.

```
Alertas TradingView (20 moedas) ──webhook──▶ FastAPI /webhook
                                                  │  build_plan()  (strategy.py)
                                                  ▼
      Feed Bybit (ccxt) ───polling───▶ Motor de paper trading (engine.py)
                                                  │  fills / TPs / corte
                                                  ▼
                                            SQLite  ──▶  Dashboard  /
```

## Estratégia (parâmetros confirmados)

| Parâmetro | Valor | Onde muda |
|---|---|---|
| Conta virtual | $5.000 | `app/config.py` → `account_start_usd` |
| Risco por trade | 2% ($100), dimensionado até ao `zone_break` | `risk_pct` |
| Entradas | limites espalhados pelos POCs da zona → 1 posição a **preço médio** | `max_entry_orders` |
| Validade das entradas | 2 horas, depois cancela o que não encheu | `entry_ttl_minutes` |
| Alvos TP1/TP2/TP3 | próximas 3 zonas de POC; **zonas a <1% não contam** | `min_target_dist_pct` |
| Split dos TPs | 30% / 40% / 30% | `tp_split` |
| Stop | **manual** — corte automático só no **fecho de vela** para lá do `zone_break` | `break_timeframe` |

## Como funciona a peça-chave

O alerta do TradingView, por si só, não chega para executar o setup: o backend
precisa dos **níveis exatos de POC**. Por isso o indicador é modificado (ver
`indicator/webhook_patch.pine`) para o `alert()` enviar um JSON:

```json
{"ticker":"BTCUSDT.P","side":"long","price":61000,
 "zone_pocs":[60800,61000,61200],"targets_up":[62500,63500],
 "targets_down":[59000],"zone_break":60500}
```

- `zone_pocs` → onde se espalham as ordens limite (entrada a preço médio)
- `targets_up`/`targets_down` → o backend filtra os <1% e escolhe TP1/TP2/TP3
- `zone_break` → stop efetivo (sizing + corte no fecho de vela)

## Setup no TradingView

1. Aplica o `indicator/webhook_patch.pine` ao teu indicador (instruções no ficheiro).
2. Por cada moeda (≤20 no plano Essential): cria **1 alerta**
   - Condition: `POC POC MAX v2` → **"Any alert() function call"**
   - Webhook URL: `https://TEU_DOMINIO/webhook`
   - Expiration: "Open-ended"

## Correr localmente

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Dashboard em `http://localhost:8000` · webhook em `POST /webhook`.

Testar sem TradingView (simular um alerta):

```bash
curl -X POST http://localhost:8000/webhook -H 'Content-Type: application/json' -d '{
  "ticker":"BTCUSDT.P","side":"long","price":61000,
  "zone_pocs":[60800,61000,61200],"targets_up":[62500,63500],
  "targets_down":[59000],"zone_break":60500}'
```

## Deploy no VPS (systemd + nginx)

Ver `deploy/` — `poc-strat.service` (serviço sempre ligado) e `nginx.conf`
(HTTPS + proxy para o webhook). Passos resumidos:

```bash
# no VPS
git clone <repo> /opt/poc-strat && cd /opt/poc-strat
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
sudo cp deploy/poc-strat.service /etc/systemd/system/ && sudo systemctl enable --now poc-strat
sudo cp deploy/nginx.conf /etc/nginx/sites-available/poc-strat  # ajusta o domínio
sudo ln -s /etc/nginx/sites-available/poc-strat /etc/nginx/sites-enabled/ && sudo systemctl reload nginx
sudo certbot --nginx -d TEU_DOMINIO      # HTTPS (o TradingView exige 443)
```

Define um segredo para o webhook: `export POC_WEBHOOK_SECRET=xxxx` (e inclui
`"secret":"xxxx"` no JSON do alerta) para ninguém injetar trades falsas.

## Testes

```bash
pytest -q       # lógica de estratégia + ciclo de vida + webhook/dashboard
```

## Estado atual e próximos passos

- ✅ Webhook, motor de estratégia, paper trading (fills realistas, TPs, corte), dashboard
- ⬜ Websocket da Bybit em vez de polling (fills mais finos)
- ⬜ Curva de equity gráfica + métricas (profit factor, drawdown, R múltiplo)
- ⬜ Notificações (Telegram/Discord) quando uma trade abre/fecha
