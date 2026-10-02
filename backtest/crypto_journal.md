# 🟣 CRYPTO LIVE — POC MTF + Divergências

*Conta real em cripto (Bybit, perpétuos). Estratégia: indicador "POC Multi-TF [visual]"
(`indicator/poc_multitf_visual.pine`) — divergência de RSI (clássica ou multi-TF em
5/15/30) confirmada dentro de uma zona densa de POCs ("teia"). P&L em €.*

### Estado
- **P&L acumulado: +16€**
- Trades: 1 (1W/0L/0BE — parcial TP1 + BE no resto)

### Registo live
| # | Data | Par | Dir | Gatilho | Result | € | Notas |
|---|------|-----|-----|---------|--------|---|-------|
| C1 | 02/10 | LTCUSDT | Short | Divergência confirmada no TF de 30m + zona forte de POCs + **golden pocket da Fib** (tripla confluência) | ✅ Parcial | **+16€** | Entrada com **2 ordens limit** escalonadas perto do topo (~71.0-71.75), dentro do golden pocket (0.618-0.65) do retracement Fib. Só a 1ª bateu **TP1**; a 2ª acabou em **BE**. Resultado líquido pequeno mas positivo. Primeira trade real a validar o setup que acabámos de construir no script (div + POC, agora também com alerta próprio por TF) — boa confirmação inicial, amostra ainda mínima para tirar conclusões sobre o edge |

### Notas gerais
- Journal começado a 02/10 — sem histórico anterior a resumir.
- Objetivo nas próximas trades: registar sempre o TF da divergência (5/15/30), se a zona de POCs era calendar, trailing, ou ambas, se havia confluência com **golden pocket da Fib** (0.618-0.65), e se a entrada foi a mercado ou com limits escalonados (como nesta).
