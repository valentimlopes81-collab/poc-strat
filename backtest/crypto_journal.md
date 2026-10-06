# 🟣 CRYPTO LIVE — POC MTF + Divergências

*Conta real em cripto (Bybit, perpétuos). Estratégia: indicador "POC Multi-TF [visual]"
(`indicator/poc_multitf_visual.pine`) — divergência de RSI (clássica ou multi-TF em
5/15/30) confirmada dentro de uma zona densa de POCs ("teia"). P&L em €.*

### Estado
- **P&L acumulado: +16€ confirmado** (C1) + **C2 em curso** (TP1 batido, resto em BE — valor final por confirmar)
- Trades: 2 (1W confirmado/0L/0BE + 1 em curso)
- **Mudança de processo anunciada (05/10):** passar a usar **stop loss mais manual**, gerido pela invalidação real do setup (ex.: falta de força vendedora/compradora a confirmar), em vez de só confiar no stop automático inicial — mantém-se como boa prática mesmo depois da correção da C2 abaixo.

### Registo live
| # | Data | Par | Dir | Gatilho | Result | € | Notas |
|---|------|-----|-----|---------|--------|---|-------|
| C1 | 02/10 | LTCUSDT | Short | Divergência confirmada no TF de 30m + zona forte de POCs + **golden pocket da Fib** (tripla confluência) | ✅ Parcial | **+16€** | Entrada com **2 ordens limit** escalonadas perto do topo (~71.0-71.75), dentro do golden pocket (0.618-0.65) do retracement Fib. Só a 1ª bateu **TP1**; a 2ª acabou em **BE**. Resultado líquido pequeno mas positivo. Primeira trade real a validar o setup que acabámos de construir no script (div + POC, agora também com alerta próprio por TF) — boa confirmação inicial, amostra ainda mínima para tirar conclusões sobre o edge |
| C2 | 05/10 | HYPEUSDT | Short | Setup validado pelo sistema (div + POC) | ⏳ Em curso | **TP1 ✓ + BE no resto** | **Correção (06/10):** o relato inicial de loss de −25€ estava errado — não foi stopped (falhou por poucos cêntimos), e entretanto já bateu **TP1** e o resto ficou em BE. P&L final por confirmar quando fechar. Lição do processo (SL manual por invalidação) mantém-se válida como boa prática, só o resultado desta trade específica é que estava mal registado |

### Notas gerais
- Journal começado a 02/10 — sem histórico anterior a resumir.
- Objetivo nas próximas trades: registar sempre o TF da divergência (5/15/30), se a zona de POCs era calendar, trailing, ou ambas, se havia confluência com **golden pocket da Fib** (0.618-0.65), e se a entrada foi a mercado ou com limits escalonados (como nesta).
- A partir de 05/10: registar também se o SL foi gerido manualmente pela invalidação (e qual foi essa invalidação) ou se ficou só no stop automático inicial.
