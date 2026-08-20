# Backtest manual — MNQ (sessão de NY)

Sessão de replay, timeframe **5 min**, janela **manhã de NY**.
Modelos em teste: **(A)** divergência RSI + zona · **(B)** liquidez/aceitação em zona (sweep + acceptance).
Zonas de referência: POC/VAH/VAL dia anterior, POC overnight, VWAP, POC a desenvolver, Asia high/low.
Início dos dados: **29/06/2026**. Risco por trade = 1R (BE = 0R).
**Regra da sessão:** 1 setup por dia — depois de entrar, fora o resto do dia.

## Estatísticas (atualizado a cada lote)

- Trades registadas: **1**
- Wins / Losses / BE: **1 / 0 / 0**
- Win rate: **100%** (1/1)
- R total: **+2.43R**
- Expectância (R por trade): **+2.43R**
- Profit factor: **— (sem perdas ainda)**
- Melhor zona: **PD POC** (1 win)

> Amostra ainda minúscula (1 trade) — números não significam nada até ~20-30. Só a acumular.

## Registo

| # | Data | Dir | Gatilho | Zona | Entrada | Stop | Alvo | Saída | Result | R | Notas |
|---|------|-----|---------|------|---------|------|------|-------|--------|---|-------|
| 1 | 29/06 ~10:00 ET | Short | Liquidez/aceitação | PD POC | 29552.5 | 29629.75 (PD VAH) | 29364.5 (Asia low) | TP 29364.5 | ✅ Win | **+2.43R** | sweep highs pré-market → manipulação no open → close 5m < PD POC & VWAP = aceitação p/ baixo; BE no PD VAL; out o resto do dia |

## Notas detalhadas

### Trade 1 — 29/06, short @ 29552.5
**Contexto/tese:**
- Antes do open houve **sweep dos highs no pré-market** → a liquidez interessante passou a estar **em baixo**.
- No open, **manipulação** a tirar os highs (varreu a liquidez de cima).
- **Fecho de 5 min abaixo do PD POC e da VWAP** → leu-se como **aceitação de preços mais baixos** → gatilho do short.
- **Entrada:** 29552.5, no **PD POC**.
- **Stop:** 29629.75, no **PD VAH** — lógica: se lá chegasse, já não seria aceitação dos preços de baixo mas sim dos de cima (invalida a tese).
- **Alvo:** 29364.5, nos **lows da Ásia** (liquidez oposta).
- **Gestão:** BE colocado no **PD VAL** (~29467).

**Métricas:**
- Risco = 29629.75 − 29552.5 = **77.25 pts**
- Alvo = 29552.5 − 29364.5 = **188 pts** → se TP cheio = **+2.43R**
- Se bateu BE antes = **0R**

**Resultado:** ✅ **TP cheio nos 29364.5 → +2.43R.** Ficou fora o resto do dia (1 setup/dia).
