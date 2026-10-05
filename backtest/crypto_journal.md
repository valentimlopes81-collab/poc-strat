# 🟣 CRYPTO LIVE — POC MTF + Divergências

*Conta real em cripto (Bybit, perpétuos). Estratégia: indicador "POC Multi-TF [visual]"
(`indicator/poc_multitf_visual.pine`) — divergência de RSI (clássica ou multi-TF em
5/15/30) confirmada dentro de uma zona densa de POCs ("teia"). P&L em €.*

### Estado
- **P&L acumulado: −9€** (+16€ − 25€)
- Trades: 2 (1W/1L/0BE)
- **Mudança de processo anunciada (05/10):** passar a usar **stop loss mais manual**, gerido pela invalidação real do setup (ex.: falta de força vendedora/compradora a confirmar), em vez de só confiar no stop automático inicial — para conseguir cortar trades mortas mais cedo e poupar R:R, como na C2.

### Registo live
| # | Data | Par | Dir | Gatilho | Result | € | Notas |
|---|------|-----|-----|---------|--------|---|-------|
| C1 | 02/10 | LTCUSDT | Short | Divergência confirmada no TF de 30m + zona forte de POCs + **golden pocket da Fib** (tripla confluência) | ✅ Parcial | **+16€** | Entrada com **2 ordens limit** escalonadas perto do topo (~71.0-71.75), dentro do golden pocket (0.618-0.65) do retracement Fib. Só a 1ª bateu **TP1**; a 2ª acabou em **BE**. Resultado líquido pequeno mas positivo. Primeira trade real a validar o setup que acabámos de construir no script (div + POC, agora também com alerta próprio por TF) — boa confirmação inicial, amostra ainda mínima para tirar conclusões sobre o edge |
| C2 | 05/10 | HYPEUSDT | Short | Setup validado pelo sistema (div + POC), mas **sem força vendedora real** a aparecer depois da entrada | ❌ Loss | **−25€** | Preço continuou a subir com força (impulso de ~89,70 até acima de 95) sem qualquer rejeição vendedora genuína — a invalidação de facto já estava visível antes do stop automático ser atingido. Auto-diagnóstico correto: "podia ter cortado a trade e poupado R:R". **Decisão de processo a reter:** a partir de agora, gerir o stop de forma mais manual com base na invalidação real do cenário (ex.: ausência de reação vendedora), não só esperar pelo stop fixo inicial — mesma lição de disciplina que já tínhamos identificado no MNQ (gerir pela invalidação predefinida, não pelo "sentir" do preço) |

### Notas gerais
- Journal começado a 02/10 — sem histórico anterior a resumir.
- Objetivo nas próximas trades: registar sempre o TF da divergência (5/15/30), se a zona de POCs era calendar, trailing, ou ambas, se havia confluência com **golden pocket da Fib** (0.618-0.65), e se a entrada foi a mercado ou com limits escalonados (como nesta).
- A partir de 05/10: registar também se o SL foi gerido manualmente pela invalidação (e qual foi essa invalidação) ou se ficou só no stop automático inicial.
