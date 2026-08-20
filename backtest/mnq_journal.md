# Backtest manual — MNQ (sessão de NY)

Sessão de replay, timeframe **5 min**, janela **manhã de NY**.
Modelos em teste: **(A)** divergência RSI + zona · **(B)** liquidez/aceitação em zona (sweep + acceptance).
Zonas de referência: POC/VAH/VAL dia anterior, POC overnight, VWAP, POC a desenvolver, Asia high/low.
Início dos dados: **29/06/2026**. Risco por trade = 1R (BE = 0R).
**Regra da sessão:** 1 setup por dia — depois de entrar, fora o resto do dia.

## Estatísticas (atualizado a cada lote)

- Dias observados: **5** (29/06 → 03/07)
- Dias com setup: **3** · Dias sem setup (no-play): **2** (01/07, 03/07)
- Trades registadas: **3**
- Wins / Losses / BE: **3 / 0 / 0**
- Win rate: **100%** (3/3)
- R total: **+6.76R**
- Expectância (R por trade): **+2.25R**
- Profit factor: **— (sem perdas ainda)**
- Melhor zona: **PD POC** (2 wins, ambos short) · PD VAH+VWAP (1 win long)
- Distância média do stop: ~101 pts (77 / 87 / 139) — relevante p/ sizing real em MNQ

> Amostra ainda minúscula (2 trades) — números não significam nada até ~20-30. Só a acumular.

## Registo

| # | Data | Dir | Gatilho | Zona | Entrada | Stop | Alvo | Saída | Result | R | Notas |
|---|------|-----|---------|------|---------|------|------|-------|--------|---|-------|
| 1 | 29/06 ~10:00 ET | Short | Liquidez/aceitação | PD POC | 29552.5 | 29629.75 (PD VAH) | 29364.5 (Asia low) | TP 29364.5 | ✅ Win | **+2.43R** | sweep highs pré-market → manipulação no open → close 5m < PD POC & VWAP = aceitação p/ baixo; BE no PD VAL; out o resto do dia |
| 2 | 30/06 open NY | Long | Aceitação/continuação | PD VAH + VWAP | 30085.5 | 29998.5 (< low pré-market & PD VAH) | TP1 30217.25 (HOD) · TP2 30264.5 (high sem. passada) | TP1+TP2 | ✅ Win | **+1.79R** (50/50) | dia bullish; close 14:30 > VAH & VWAP = aceitação p/ cima; scale-out HOD → important high; BE após TP1 |
| — | 01/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | pré-market abaixo de todos os POIs; low-prob day; só longs em aceitação > PD VAL, que nunca deu; PA feia, ficou fora |
| 3 | 02/07 15:05 | Short | Rejeição em POI | PD POC | 30180 | 30319.5 (HOD) | 29825.75 (EQL London / LOD) | TP 29825.75 | ✅ Win | **+2.54R** | bias bearish; rejeição categórica no PD POC; BE no impulso da vela 14:40; TP cheio nos lows |
| — | 03/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | meio-dia US (fecho antecipado, véspera de 4 jul); sem volume; bias bearish mas queria aceitação < VAH que nunca deu; sem trade |

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

### Dia 3 — 01/07, NO-PLAY (sem trade)
**Contexto:**
- No fim da NY afternoon do dia 30 parece ter-se formado um **topo**.
- No 5 min, no pré-market do dia 01, o preço estava **abaixo de todos os POIs** relevantes → **low-prob day**.
- Plano: só olhar **longs**, e apenas numa **aceitação acima do PD VAL**.
- **Nenhum POI deu entry** e a price action não agradou → **ficou de fora o dia todo.**

**Opinião (coach):** decisão **correta e disciplinada**. Quando o preço não está em nenhum POI e a PA é feia, não há trade — forçar seria pagar para jogar. Estar abaixo de todos os POIs tira-te a referência de onde tomar risco; o único cenário (long em aceitação > PD VAL) nunca se armou. **Não jogar também é uma decisão que protege o R.** Os dois dias anteriores foram A+; dias como este são os que separam quem sobrevive de quem devolve os ganhos. 👍

### Trade 3 — 02/07, short @ 30180
**Contexto/bias (pré-market):**
- Bias **claramente bearish**: dia 1 foi só queda; dia 2 a sessão de Londres até foi bullish, mas continuávamos **abaixo dos POIs** no pré-market.
- **PD POC deu entry short no pré-market** → reforçou a leitura bearish.
- **Dois cenários mapeados:**
  1. Aceitação **abaixo do PD VAL** → short com target nos **EQL de Londres**.
  2. Aceitação **acima do PD POC** → long, com os **highs do dia 30** como target.

**Execução:**
- Abertura em **terra de ninguém** (abaixo dos POIs mas a subir ligeiramente).
- Fechou uma vela de 5 min **acima do VAL** → tirou a ideia de short nesse ponto; passou a vigiar o **PD POC**.
- **Rejeição categórica no PD POC** → no fecho da vela das **15:05** abriu **short**.
- **Entrada:** 30180 · **Stop:** 30319.5 (HOD — invalidação) · **TP:** 29825.75 (EQL London / lows do dia).
- Sellers assumiram o controlo e **quebraram o VAL**; BE colocado no impulso comprador da vela das 14:40; **TP cheio nos lows**.

**Auto-crítica (do próprio):** faltou cuidado com o **PD VAL como potencial suporte** — podia ter travado o short. Correu bem porque os sellers dominaram, mas fica a nota para a próxima: contar o VAL como obstáculo antes do target.

**Métricas:**
- Risco = 30319.5 − 30180 = **139.5 pts**
- Reward = 30180 − 29825.75 = **354.25 pts** → **+2.54R**

**Resultado:** ✅ **TP cheio → +2.54R.** Modelo B (rejeição em POI), lado curto.

**Opinião (coach):** leitura **adaptativa de nível pro**. O melhor não foi o R — foi teres entrado com bias bearish mas **sem casar com ela**: estavas pronto a ir long acima do PD POC. Deixaste o preço escolher (fecho acima do VAL tirou o short cedo; rejeição no PD POC deu o short bom). Essa flexibilidade é o que separa "ter uma opinião" de "ler o mercado". E a auto-crítica do VAL mostra que já vês o detalhe que quase te escapou — é assim que se evolui.

### Dia 5 — 03/07, NO-PLAY (sem trade)
**Contexto:**
- Bias **bearish**: só descemos no dia 2 e a recuperação desde o fim de NY vinha **fraca** (compradores com pouca força).
- POIs em baixo (PD POC e VAL) + lows que interessava ver "taken". Para short queria **aceitação abaixo do VAH** — caso contrário o move não compensava.
- **Sessão fina / fecho antecipado** (3 jul = meio-dia US, véspera do feriado de 4 de julho). **Sem volume → sem trade.**

**Nota de padrão:** à volta de feriados americanos (3-4 jul, Thanksgiving, etc.) as sessões são meias/finas — geralmente **evitar**. Registar para futuro.
