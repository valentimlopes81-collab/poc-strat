# NQ/BTC Terminal

Terminal de contexto para NQ e BTC: níveis de opções (GEX, walls, zero-gamma, 0DTE), preço, volatilidade, order flow de BTC, macro e performance. Em produção em https://nq-btc-terminal.vercel.app.

Tudo é contexto, nunca sinal de entrada.

## Como os dados chegam ao ecrã

| O quê | De onde | Frescura |
|---|---|---|
| Níveis, exposições, perfil de GEX, 0DTE, expected move, IV (NQ) | `/api/nq` · cadeia QQQ da Cboe | calculado a pedido, cache de 60 s; as cotações da Cboe têm 15 min de atraso |
| O mesmo para BTC, mais DVOL e funding | `/api/btc` · Deribit | 60 s |
| Velas NQ=F, VIX, DXY · velas BTC · volume de opções QQQ | `/api/candles` · Yahoo, Kraken, Cboe | 60 s (NQ=F com ~10 min de atraso) |
| Correlações, EWMA, GARCH | `/api/cross` · Yahoo | 15 min |
| Calendário macro, COT | `/api/macro` · ForexFactory, CFTC | 1 h |
| Preço, livro de ordens e trades de BTC | WebSocket público da Kraken, direto do browser | tempo real |
| Plano do dia, alertas manuais, scorecard, journal | `public/data/*.json`, escritos pelas rotinas | lidos do GitHub, visíveis em ~5 min sem deploy |

As funções em `api/` são serverless (Vercel), em JavaScript puro e sem dependências. A matemática está em `api/_lib` e é a mesma de `backtest/quant/gex_common.py` (que as rotinas de briefing usam); os testes dos dois lados verificam os mesmos valores de referência.

Se a API não responder, o site mostra o último snapshot guardado em `public/data/snap/` e o cabeçalho passa a dizer "snapshot". O workflow `terminal-data-refresh` grava esses snapshots e acrescenta ao histórico em `public/data/history/`.

O preço usado nos cálculos do NQ é o QQQ que os futuros implicam neste momento (rácio NQ/QQQ medido no instante da última cotação da Cboe), por isso os níveis continuam a fazer sentido de madrugada, com a cadeia parada e o NQ a negociar.

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173, com as funções de api/ servidas localmente
npm test           # vitest: greeks, exposições, parsers, regras de alerta, estatísticas
npm run build      # type-check + bundle
npm run levels     # imprime os níveis de NQ e BTC tal como o site os calcula
npm run snapshot   # grava snapshots e histórico (o que o workflow faz)
```

Testes do lado Python: `python -m pytest tests/test_gex_common.py` na raiz do repositório.

Depois de mexer em `api/_lib`, reiniciar o `dev`/`preview`: o Node mantém os módulos importados em cache.

## Deploy

Push para o branch faz deploy no Vercel (root `terminal/`). O `vercel.json` salta o build quando só mudou `public/data` desde o último deploy — os commits de dados não precisam dele porque o site lê esses ficheiros do GitHub.

## Limites conhecidos

- GEX, vanna e charm assumem a convenção pública de posicionamento dos dealers (long calls, short puts), a partir do open interest. Não é fluxo observado.
- Vanna e charm excluem contratos que expiram nas próximas 24 h.
- O livro de ordens e o CVD são só da Kraken spot.
- Os alertas automáticos e o histórico ao minuto vivem no browser onde o terminal está aberto.
