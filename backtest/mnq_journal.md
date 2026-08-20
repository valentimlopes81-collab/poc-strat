# Backtest manual — MNQ (sessão de NY)

Sessão de replay, timeframe **5 min**, janela **manhã de NY**.
Modelos em teste: **(A)** divergência RSI + zona · **(B)** liquidez/aceitação em zona (sweep + acceptance).
Zonas de referência: POC/VAH/VAL dia anterior, POC overnight, VWAP, POC a desenvolver, Asia high/low.
Início dos dados: **29/06/2026**. Risco por trade = 1R (BE = 0R).
**Regra da sessão:** 1 setup por dia — depois de entrar, fora o resto do dia.

## Estatísticas (atualizado a cada lote)

- Trades registadas: **2**
- Wins / Losses / BE: **2 / 0 / 0**
- Win rate: **100%** (2/2)
- R total: **+4.22R**
- Expectância (R por trade): **+2.11R**
- Profit factor: **— (sem perdas ainda)**
- Melhor zona: PD POC (short) · PD VAH+VWAP (long) — ambas 1 win

> Amostra ainda minúscula (2 trades) — números não significam nada até ~20-30. Só a acumular.

## Registo

| # | Data | Dir | Gatilho | Zona | Entrada | Stop | Alvo | Saída | Result | R | Notas |
|---|------|-----|---------|------|---------|------|------|-------|--------|---|-------|
| 1 | 29/06 ~10:00 ET | Short | Liquidez/aceitação | PD POC | 29552.5 | 29629.75 (PD VAH) | 29364.5 (Asia low) | TP 29364.5 | ✅ Win | **+2.43R** | sweep highs pré-market → manipulação no open → close 5m < PD POC & VWAP = aceitação p/ baixo; BE no PD VAL; out o resto do dia |
| 2 | 30/06 open NY | Long | Aceitação/continuação | PD VAH + VWAP | 30085.5 | 29998.5 (< low pré-market & PD VAH) | TP1 30217.25 (HOD) · TP2 30264.5 (high sem. passada) | TP1+TP2 | ✅ Win | **+1.79R** (50/50) | dia bullish; close 14:30 > VAH & VWAP = aceitação p/ cima; scale-out HOD → important high; BE após TP1 |

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

### Trade 2 — 30/06, long @ 30085.5
**Contexto macro:**
- Dia 29 à tarde (NY) houve **grande pump** → criou um **range**.
- Na sessão da Ásia o range **desmontou-se** com **continuação dos buyers**. Bias claramente **bullish** a entrar no dia 30.

**Pré-open — dois cenários planeados:**
1. **(Priorizado)** Aceitação **acima do PD VAH e da VWAP** (close no 1 min) → alvo no **HOD** e num **high importante da semana passada**. Priorizado por estarmos bullish no dia.
2. **(Descartado)** Sucessivas **rejeições** desses dois POI (VAH + VWAP) e revisita ao **PD POC** (muito longe) → baixa probabilidade; mesmo com o Asia low como alvo, o **RR seria baixo** → não jogável.

**Execução (cenário 1 confirmou-se):**
- No open de NY o **impulso comprador continuou**; a candle das **14:30 fechou acima do VAH e da VWAP** → gatilho da long de continuação.
- **Entrada:** 30085.5
- **Stop:** 29998.5 — abaixo do **low do pré-market** (e do VAH). Invalidação: se voltasse abaixo, já não haveria aceitação dos preços mais altos.
- **TP1:** 30217.25 (HOD) · **TP2:** 30264.5 (important high da semana passada). BE após TP1.

**Métricas:**
- Risco = 30085.5 − 29998.5 = **87 pts**
- TP1 = +131.75 pts = **+1.51R** · TP2 = +179 pts = **+2.06R**
- Scale-out **50/50** (confirmado) → **+1.79R**

**Resultado:** ✅ **Ambos os TPs atingidos.** Modelo B (aceitação/continuação), lado longo.

**Prints:** enviadas na conversa (execução + tese). Ficheiros não anexados ao repo — descrição acima serve de registo.
