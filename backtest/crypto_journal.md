# 🟣 CRYPTO LIVE — POC MTF + Divergências

*Conta real em cripto (Bybit, perpétuos). Estratégia: indicador "POC Multi-TF [visual]"
(`indicator/poc_multitf_visual.pine`) — divergência de RSI (clássica ou multi-TF em
5/15/30) confirmada dentro de uma zona densa de POCs ("teia"). P&L em €.*

### Estado
- **P&L acumulado: +70,5€** (C1 +16€ + C2 +54,5€ + C3 0€)
- Trades: 3 (2W/0L/1BE)
- **Mudança de processo anunciada (05/10):** passar a usar **stop loss mais manual**, gerido pela invalidação real do setup (ex.: falta de força vendedora/compradora a confirmar), em vez de só confiar no stop automático inicial — mantém-se como boa prática independentemente do resultado de cada trade.

### Registo live
| # | Data | Par | Dir | Gatilho | Result | € | Notas |
|---|------|-----|-----|---------|--------|---|-------|
| C1 | 02/10 | LTCUSDT | Short | Divergência confirmada no TF de 30m + zona forte de POCs + **golden pocket da Fib** (tripla confluência) | ✅ Parcial | **+16€** | Entrada com **2 ordens limit** escalonadas perto do topo (~71.0-71.75), dentro do golden pocket (0.618-0.65) do retracement Fib. Só a 1ª bateu **TP1**; a 2ª acabou em **BE**. Resultado líquido pequeno mas positivo. Primeira trade real a validar o setup que acabámos de construir no script (div + POC, agora também com alerta próprio por TF) — boa confirmação inicial, amostra ainda mínima para tirar conclusões sobre o edge |
| C2 | 05/10 | HYPEUSDT | Short | Setup validado pelo sistema (div + POC) | ✅ Win (fechado) | **+54,5€** | Trade escalonada: quase stopped por poucos cêntimos, recuperou, bateu TP1, depois mais um TP no 0,5 da Fib (91,40) com saída de 75% da posição, e fechou o resto com **full TP** em 07/10. Correção de percurso registada (relato inicial de loss estava errado). Boa trade a validar o setup div+POC numa sequência de exits escalonados |
| C3 | 07/10 | BTCUSD | Long (div bullish em zona de POCs, estratégia por zona — vários POCs, não um ponto único) | Divergência bullish em zona de POCs | ⚪ BE | 0R | **0€** | Entrada com **DCA planeado** (normal nesta estratégia: as POCs formam zonas com vários níveis, não um ponto exato, por isso escalona entradas pela zona). Reação forte a favor logo a seguir à abertura → moveu para **BE**, e ao fazê-lo cancelou corretamente os limits do DCA mais abaixo (manter DCA aberto depois de já seguro em BE reintroduziria risco desnecessário). **Clarificação:** isto não é a mesma dinâmica da lição de 05/10 no MNQ (BE precipitado por desconforto) — é gestão coerente e por desenho desta estratégia de zona/DCA: reação forte → protege em BE → fecha a porta ao risco adicional do DCA. Resultado: sem loss |

### Notas gerais
- Journal começado a 02/10 — sem histórico anterior a resumir.
- Objetivo nas próximas trades: registar sempre o TF da divergência (5/15/30), se a zona de POCs era calendar, trailing, ou ambas, se havia confluência com **golden pocket da Fib** (0.618-0.65), e se a entrada foi a mercado ou com limits escalonados (como nesta).
- A partir de 05/10: registar também se o SL foi gerido manualmente pela invalidação (e qual foi essa invalidação) ou se ficou só no stop automático inicial.
