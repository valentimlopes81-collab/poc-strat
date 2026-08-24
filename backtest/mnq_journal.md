# Backtest manual — MNQ (sessão de NY)

Sessão de replay, timeframe **5 min**, janela **manhã de NY**.
Modelos em teste: **(A)** divergência RSI + zona · **(B)** liquidez/aceitação em zona (sweep + acceptance).
Zonas de referência: POC/VAH/VAL dia anterior, POC overnight, VWAP, POC a desenvolver, Asia high/low.
Início dos dados: **29/06/2026**. Risco por trade = 1R (BE = 0R).
**Regra da sessão:** 1 setup por dia — depois de entrar, fora o resto do dia.
**Metodologia:** a tese/plano é escrita em **pré-market, sem ver a sessão**; a execução é registada depois. Separa plano de outcome (anti-hindsight). ✓

## Estatísticas (atualizado a cada lote)

### Cumulativo (todos os blocos)
- Trades: **22** · Wins/Losses/BE: **12 / 5 / 5**
- Win rate: **71%** decididas (12/17) · **55%** incl. BE (12/22)
- R total: **+10.40R** · Expectância: **+0.47R/trade** · PF (R): **15.40 / 5.0 = 3.1**

### Por bloco
| Bloco | Trades | R | Notas |
|---|---|---|---|
| **Julho 2026** (29/06→31/07) | 14 | **+6.12R** | regime trend/dump (adverso); edge veio da lua-de-mel |
| **Janeiro 2026** (02/01→09/01) | 4 | **+0.03R** | ~flat; range/lento; T18 = caso-escola do leak nº1 |
| **Fevereiro 2026** (27/02) | 1 | **+0.69R** | 1min disponível a partir daqui |
| **Março 2026** (02/03→…) | 3 | **+3.56R** | 9 dias: T20 +2.09, T21 BE, T22 +1.47; 6 no-play (02,03,04,09,10,12) |

### 🔑 ANÁLISE — 20 trades (3+ regimes)
**Global:** +8.93R · 11W/5L/4BE · WR 69% (decididas) · PF 2.8 · expectância +0.45R.
As 5 losses são **todas −1R** (gestão consistente). Os 4 BE = gestão a proteger scratches.

**A descoberta que muda tudo — remover o leak nº1 (catch-support/antecipação):**
- Trades do leak (T6, T8, T10, T16, T18): **−3R, 2 BE, 0 wins limpos.**
- **Sem essas 5 trades** → 15 trades: 11W, 2L (T11 contra-bias, T13), 2 BE.
  - R = **+11.93R** · Expectância **+0.80R/trade** · **PF ~7.0**.
- Ou seja: **o mesmo sistema, só cortando a antecipação, quase DOBRA a expectância e triplica o PF.**

**Conclusão:** o edge (aceitação/rejeição confirmada no value) é sólido e **atravessa os 3 regimes**. O que trava os números é **1 comportamento** — antecipar o extremo do value. Não é um problema de sistema; é 1 regra de execução.

### ⚠️⚠️ Leak nº1 (JÁ PROVADO) — "apanhar suporte no extremo do value"
Sub-setup = comprar/vender o extremo do value **antecipando** que segura (vs entrar NA reação confirmada).
Histórico: **T6 −1R · T8 BE · T10 −1R · T16 BE · T18 −1R** = **−3R, 2 BE, 0 wins limpos** em 5 tentativas.
Contraste: wins de value = **sempre aceitação/reação confirmada** (T1/2/3/5/15).
**09/01 é o caso-escola:** a −1R foi antecipação; a "play certa textbook" do mesmo dia foi a **reação confirmada** (marcada pelo tagger ▲). Mesma zona/direção — só muda o timing.
→ **REGRA: nunca antecipar o extremo do value. Esperar o ✖/▲ de recusa/aceitação confirmada.**

### Leak nº2 — hesitar na reação confirmada
08/01: recusa confirmada do PD VAL (setup tipo-A) não jogada → dump perdido. Face oposta do nº1.
→ Ambos = **timing da leitura**. Alvo: entrar **na** confirmação — nem antes (nº1) nem depois (nº2).
- Trades registadas: **12** (14/07 teve 2)
- Wins / Losses / BE: **7 / 3 / 2**
- Win rate: **70%** decididas (7/10) · **58%** incl. BE (7/12)
- R total: **+5.91R**
- Expectância (R por trade, incl. BE): **+0.49R**
- Profit factor (R): **8.91 / 3.0 = 3.0** · payoff médio ~1.3R
- Melhor zona: **PD POC** (workhorse)
- Distância média do stop: ~115 pts (stops largos capam o R dos winners → payoff só ~1.3R)
- **Nota de regime:** primeiras 3 trades = +6.76R; trades 4→13 = **−1.85R**. O edge nos livros veio TODO da lua-de-mel; o resto de julho (regime de trend/dump vertical) foi hostil ao modelo.
- **Hipótese a testar (edge):** GANHA quando entra em **aceitação/rejeição CONFIRMADA e alinhada com a bias** (T1/2/3/5/7/9). PERDE quando **antecipa** (apanhar suporte: T6/T10) ou **luta a própria bias** (T11 short num dia que planeou longs). → *Entrar NA confirmação, no sentido da bias. Nunca antecipar nem contrariar o próprio plano.*

> Amostra ainda minúscula (2 trades) — números não significam nada até ~20-30. Só a acumular.

## ANÁLISE — Bloco de Julho FECHADO (29/06 → 31/07, 14 trades)

**Resultado:** +6.12R · 8W/4L/2BE · PF 2.5 · expectância +0.44R/trade · setup em ~52% dos dias.

**A decomposição que explica tudo:**
| Fase | Trades | R |
|---|---|---|
| Lua-de-mel (1–3) | 3 | **+6.76R** |
| Resto de julho (4–14) | 11 | **−0.64R** |

→ O edge nos livros veio **todo** dos 3 primeiros dias (regime de rotação/reversão). O resto de julho foi **trend/dump vertical** — hostil a um modelo de reversão em POI. Não é o edge partido; é **dependência de regime**.

**Padrão de execução (o que separa W de L):**
- ✅ GANHA: entrar em **aceitação/rejeição CONFIRMADA**, no sentido da bias (T1/2/3/5/7/9/12).
- ❌ PERDE: **antecipar** (apanhar suporte T6/T10), **contrariar a bias** (T11), ou **forçar setup tardio/marginal** (T4). As 4 losses + o BE fraco têm todas esta assinatura → são **desvios de execução**, não falha do setup.

**Fraquezas técnicas:**
- Stops **largos** (~115 pts médio) → payoff só ~1.3R. Colocação mais estrutural/apertada subiria o múltiplo.
- Modelo fica de fora de trends sem retração (ponto cego confirmado nos dois lados).

**Disciplina (forte):** 11 no-plays com razão objetiva; gestão a BE evitou losses; recuperou bem após o deslize de 14/07 (no 20/07 levou loss e NÃO fez revenge). Metodologia plano-pré-market→execução mantida.

**Conclusões:**
1. **Não julgar o edge por julho** — é 1 regime, e adverso. Precisa de um mês de rotação/range para ver o outro lado (que os 3 primeiros dias sugeriram ser forte).
2. **Leak principal:** antecipar/contrariar a bias. Regra reforçada: *só na confirmação, só no sentido da bias.*
3. **Próximo passo:** testar **outro período** (idealmente mais rotacional) + trabalhar colocação de stops.

## Observações do modelo (a acumular)

- **Modelo = reversão/rejeição num POI de value area → liquidez oposta.** Precisa que o preço **volte a um POI** e o rejeite/aceite.
- **Ponto cego:** dias de **trend forte que fogem sem retração ao POI** (03, 06, 07/07 foram bearish e o preço não voltou ao value) → **sem entrada**. Correto para o modelo, mas significa **curva de equity plana em regimes de trend persistente**. Não é bug; é a natureza do sistema.
- Implicação: a frequência de setups cai quando o mercado só corre numa direção. Aceitável — mas ter presente que ficas de fora de moves grandes sem retração.

## Notas de risco (prop Lucid — 25k)

- Buffer real = **Max Loss Limit $1.000** (não os 25k). Alvo p/ passar: **$1.250**. Trailing **EOD** (só conta no close). Cap: 20 micros.
- **$300/trade = 30% do buffer** → 3 losers rebentam. Regra saudável: **~10% = ~$100/trade**.
- Conflito: 1 MNQ com stop 100–140 pts = $200–280 de risco → já é 2–3× o ideal, e não há fração em futuros.
- Saídas: **(1) conta 50k** (buffer ~2×) · **(2) stops mais apertados** · **(3) prop CFD** (lotes fracionados).
- Decisão pendente do utilizador: tamanho de conta + risco/trade final.

## Registo

| # | Data | Dir | Gatilho | Zona | Entrada | Stop | Alvo | Saída | Result | R | Notas |
|---|------|-----|---------|------|---------|------|------|-------|--------|---|-------|
| 1 | 29/06 ~10:00 ET | Short | Liquidez/aceitação | PD POC | 29552.5 | 29629.75 (PD VAH) | 29364.5 (Asia low) | TP 29364.5 | ✅ Win | **+2.43R** | sweep highs pré-market → manipulação no open → close 5m < PD POC & VWAP = aceitação p/ baixo; BE no PD VAL; out o resto do dia |
| 2 | 30/06 open NY | Long | Aceitação/continuação | PD VAH + VWAP | 30085.5 | 29998.5 (< low pré-market & PD VAH) | TP1 30217.25 (HOD) · TP2 30264.5 (high sem. passada) | TP1+TP2 | ✅ Win | **+1.79R** (50/50) | dia bullish; close 14:30 > VAH & VWAP = aceitação p/ cima; scale-out HOD → important high; BE após TP1 |
| — | 01/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | pré-market abaixo de todos os POIs; low-prob day; só longs em aceitação > PD VAL, que nunca deu; PA feia, ficou fora |
| 3 | 02/07 15:05 | Short | Rejeição em POI | PD POC | 30180 | 30319.5 (HOD) | 29825.75 (EQL London / LOD) | TP 29825.75 | ✅ Win | **+2.54R** | bias bearish; rejeição categórica no PD POC; BE no impulso da vela 14:40; TP cheio nos lows |
| — | 03/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | meio-dia US (fecho antecipado, véspera de 4 jul); sem volume; bias bearish mas queria aceitação < VAH que nunca deu; sem trade |
| — | 06/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | bias bearish (lows da sem. anterior + EQL Asia perto); manipulação no open tirou os highs c/ extremo do value como suporte; **sem target com RR perto** → sem trade |
| — | 07/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | full bearish; muitos targets em baixo mas **POIs muito acima do preço** — precisava de revisita ao value + rejeição clara p/ short, que não veio (preço nunca voltou ao POI) |
| 4 | 08/07 ~11:00 ET | Short | Rejeição/VAL a aguentar | VAL | 29257 | 29418 | 28909.25 (novos lows) | BE 29257 (17:20 local) | ⚪ BE | **0R** | entrada tardia (tail da janela → almoço); setup fraco "por causa das horas"; BE na wick pré-market (14:25 local) |
| — | 09/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | bias virou **bullish** (pump overnight; aceitação do Monday range + PD value); só longs num retrace ao extremo do value — **value não foi revisitado** → sem entry. Bias correta, sem setup |
| 5 | 10/07 14:40 | Long | Aceitação PD POC | PD POC | 29857.25 | 29797 | TP1 29963.5 · TP2 29992.75 | TP1 (50%) + BE | ✅ Win | **+0.88R** | range PD POC–PD VAL; aceitação PD POC → long p/ highs dia anterior (≈ PD VAH); TP2 não atingiu, resto BE; stop apertado 60 pts |
| — | 13/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | abriu semana p/ baixo, bias bearish; queria value como resistência p/ short ao LOD; **tirou o low ANTES de revisitar o value** → sem entry; parou de procurar às 16h (disciplina de horário ✓) |
| 6 | 14/07 | Long | Aceitação PD POC | PD POC | 29785.25 | 29685.25 (100 pts) | 30041.5 (open semanal) | Stop | ❌ Loss | **−1R** | **stop demasiado curto** (devia estar < PD POC) → wicked out; auto-identificado |
| 7 | 14/07 | Long (re-entry) | Aceitação PD POC | PD POC | 29660.25 | 29493.5 (167 pts, < PD POC ✓) | 30041.5 | Manual 29723.25 (VAH, 17h) | ✅ Win | **+0.38R** | re-entry "muito confiante na bias" (**quebra da regra 1/dia**); stop corrigido; fecho manual pequeno no VAH às 17h |
| 8 | 15/07 | Long | Aceitação PD POC (suporte) | PD POC | 29806 | 29708.5 (97.5 pts) | 30094.5 (high sem. passada) | BE 29806 | ⚪ BE | **0R** | bias bullish (value como suporte); reagiu ligeiramente acima do PD POC; subiu ~+0.8R (29886.5) e voltou; BE, sem TP. **Voltou à regra 1/dia ✓** |
| 9 | 16/07 14:35 | Short | Continuation < value | low semana (key) | 29417.75 | 29531.75 (114 pts) | TP1 29303.5 (low semana) · TP2 29096 | TP1 (50%) + BE | ✅ Win | **+0.50R** | dia 15 fechou full bearish; a trocar < PD value; short continuation; TP1 no low da semana, runner p/ TP2 (não veio) → BE; disciplina 1/dia ✓ |
| — | 17/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | full dump quinta→sexta (visitou o TP2 de 16/07); 2 lows ainda p/ tirar mas cenário pouco jogável e sem setup claro p/ short; ficou de fora |
| 10 | 20/07 | Long | "Apanhar suporte" PD VAH | PD VAH | 29009.5 | 28908.5 (low NY, 101 pts) | 29192.75 (HOS NY) | Stop | ❌ Loss | **−1R** | range ON POC–PD VAH aceite p/ cima na London; tentou VAH como suporte; stopado. **Levou a loss e fechou charts — SEM revenge (lição do 14/07 aplicada) ✓** |
| 11 | 21/07 | Short | Aceitação < PD VAH (**contra bias**) | PD VAH | 29117.75 | 29249 (high open, 131 pts) | TP1 28957 (PD POC) · TP2 28703.75 (EQL) | Stop | ❌ Loss | **−1R** | bias planeada = **LONGS** (Ásia low + rally London); jogou **short** numa "suposta aceitação < VAH" → leitura errada, contra o próprio plano; stopado |
| 12 | 22/07 | Long | **Aceitação PD VAL+POC** (confirmada ✓) | PD VAL+POC | 29163 | 28962.5 (200 pts) | TP1 29318 (PD VAH) · TP2 29509 | TP1 (50%) + BE | ✅ Win | **+0.39R** | "PA terrível" mas setup-tipo CERTO (aceitação, no sentido da leitura); quebra a série de 2 losses; stop largo (200) capou o R |
| — | 23/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | queda absurda no pré-market (limpou Monday low); POI (PD value) muito longe; open horrível; sem trade. Utilizador quer testar **meses mais atrás** (regime diferente) |
| — | 24/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | ranging no value; short no PD VAL = RR terrível (só valeria no PD POC/VAH); long possível no PD VAL p/ POC/VAH/NY high; nada se armou → sem trade |
| — | 27/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | gap up semanal; **HTF 4h bullish → semana a favorecer longs**; pré-market > PD value, preferência long p/ HOD/open semanal; mas "só caiu" e **não houve 5m close > POC** → esperou confirmação, sem entry ✓ |
| — | 28/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | Asia deu continuação de queda; plano: rejeição do value → short p/ Asia Low; aceitação → long p/ PD VAH+Asia High. Rejeição **confirmou-se** mas às ~9:20 ET (**antes do open**) → leitura certa, fora da janela, sem entry |
| 13 | 29/07 | (n/e) | POC / value | PD POC | — | — | PDL / Asia High | Stop | ❌ Loss | **−1R** | dia abriu bull mas Asia continuou queda (PDL não tirado); London voltou ao value **abaixo do POC** (desconfiança); loss. Níveis exatos não especificados. Utilizador farto do regime de julho |
| — | 30/07 | — | — | — | — | — | — | — | ⏸️ No-play | — | dump no fim da NY anterior mas Asia fez low forte → volta a favorecer longs, mas só > PD VAH; **front-run absurdo no PD VAH** → não perseguiu, sem entry ✓ |
| 14 | 31/07 | Long | PD POC suporte (bias virou bull) | PD POC | 28254 | 28079.75 (174 pts) | TP1 28725.75 · TP2 28883.25 | Manual 28464.25 (20:40, risk-free) | ✅ Win | **+1.21R** | trend parece ter virado bull (Asia low forte); PD POC como suporte; "PA não o melhor" → fechou cedo manual a +1.21R (deixou meat: preço foi à zona TP) |
| | **═══ JANEIRO 2026 ═══** | | | | | | | | | | (replay só anda de 5 em 5 min — sem dados 1m) |
| 15 | 02/01 14:40 | Long | Aceitação/reação PD VAH | PD VAH | 25689.75 | 25639.25 (low open, **50 pts**) | TP1 25794 (PWH) · TP2 25818.75 | TP1 (50%) + BE | ✅ Win | **+1.03R** | ano abriu bull, a trocar > value; manipulação no open → PD VAH → reação bullish forte; TP1 atingido (PWH pendente); stop apertado → 1ª metade +2.06R |
| 16 | 05/01 | Long | "Apanhar suporte" extremo value | value | — | — | — | BE | ⚪ BE | **0R** | subida da Asia suspeita (menos volume/agressão que a queda); acima do PD value = sem confluência p/ short; **catch-support outra vez** + **entry bem tardia** → RR mau, BE. Auto-crítica: 1min teria ajudado (sem dados) |
| 17 | 06/01 | Short | **Rejeição do PD VAH** (válido ✓) | PD VAH | — | — | — | BE | ⚪ BE | **0R** | grande vela de rejeição do value na open de London, depois subiu ao PD VAH e sentiu resistência; jogou a rejeição do VAH (única entry, ou continuação > VAH); mercado morto → não seguiu, BE bem colocado |
| — | 07/01 | — | — | — | — | — | — | — | ⏸️ No-play | — | bias bull mantém; value muito grande, EQL dentro do value; só jogaria reação nos extremos; **subiu sem tocar o VAH (front-run)** → não perseguiu, sem entry ✓ |
| — | 08/01 | (Short) | Rejeição PD VAL | PD VAL | — | — | — | — | ⚠️ Perdida | — | sellers fortes (retrace total do move de 07); **rejeição confirmada do PD VAL = setup tipo-A**, mas hesitou e não entrou; full dump que teria apanhado. Leak: **hesitação na leitura de recusa** (o tagger accept/reject é p/ isto) |
| 18 | 09/01 | Long | **"Apanhar suporte" extremo value** (leak nº1) | value low | ~25738 | −66 pts (RR 1.92) | tp1 50% | Stop | ❌ Loss | **−1R** | sexta, ranging desde o dump; "achei que o extreme se estava a segurar bem mas não foi"; **antecipação = leak nº1**. A "play certa textbook" do dia era a **reação confirmada** (tagger ▲) — mesmo dia, teria sido win |
| | **═══ FEVEREIRO 2026 (1min disponível) ═══** | | | | | | | | | | |
| 19 | 27/02 | Short | **Rejeição confirmada PD VAL** (tipo-A ✓) | PD VAL | 24880.75 | 24942.75 (62 pts) | TP1 24795.5 (low pré-mkt) · TP2 24694 | TP1 (50%) + BE | ✅ Win | **+0.69R** | dia anterior forte queda→value; pré-NY nova queda; continuation short na rejeição do value; low pré-mkt segurou (TP1), resto BE. **Setup certo no dia a seguir ao leak — boa correção** |
| | **═══ MARÇO 2026 ═══** | | | | | | | | | | |
| — | 02/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | gap down, não fechado na Asia (dump); sellers em controlo; plano = fecho de gap + rejeição do value → dump p/ lows do mês anterior; gap fechou mas **sem setup nas regras** → sem trade |
| — | 03/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | grande dump (tirou low do dia anterior); trend bearish; **value muito longe + sem gatilho limpo** → sem trade; ficou no range de London |
| — | 04/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | reação forte num POI às 6:00 (confluências) → trend inverteu bull; acima do PD value = bias bull, alvo Monday high; **front-run no PD VAH** → não perseguiu, sem play |
| 20 | 05/03 15:10 | Short | **Rejeição confirmada PD VAH** (tipo-A ✓) | PD VAH | 25131 | 25209.50 (78.5 pts) | 24966.75 (open mkt) | TP 24966.75 (100%) | ✅ Win | **+2.09R** | range a lutar dentro do PD value; não apanhou o open, esperou reação DENTRO do value; rejeição do PD VAH → short clean, full TP. **Setup-tipo perfeito, execução limpa** |
| 21 | 06/03 | Short | **Rejeição PD VAL** (resistência, tipo-A ✓) | PD VAL | — | — | — | BE | ⚪ BE | **0R** | breakout downside (sellers fortes); short na rejeição do PD VAL como resistência; **sexta + fim da killzone, pouco volume** → não seguiu, BE. Setup válido, timing fraco |
| — | 09/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | abriu semana a limpar lows importantes + gap por preencher; trend bearish forte; recuperação com pouco volume (suspeita); NY sem volume, gap fechou mas POIs acima → sem entry |
| — | 10/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | full retrace do move bearish → buyers em controlo; ranging; queria revisita ao PD value p/ long até HOD; **preço nunca perto do PD value** → sem entry |
| 22 | 11/03 | Short | **Rejeição confirmada PD VAH** (tipo-A ✓) | PD VAH | 25092 | 25180 (88 pts) | TP1 25032.25 (PD POC) · TP2 24892.5 (PDL) | TP1 (50%) + TP2 (runner) | ✅ Win | **+1.47R** | range pós-segunda; leve apatia no open (não viu logo o PD POC a segurar), esperou o VAH → rejeição → short; TP1 no POC + **runner até ao PDL** (+2.27R na 2ª metade). Runner a pagar |
| — | 12/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | dia 11 fez full retrace do move de segunda; overnight equilibrou, subiu ao extreme low do value e rejeitou → cenário de short p/ Asia low/LOD; mas **só caiu sem tocar nenhum POI** → sem entry |

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

### Trade 4 — 08/07, short @ 29257 → BE
**Contexto:**
- **Finalmente tiraram os lows** que eram target há ~1 semana → alvo cumprido.
- Plano: **long** numa aceitação do value (target = limpar os highs da quinta anterior); OU, se revisita ao value **com rejeição**, **short** até novos lows (ainda **bastante longe**).
- Dia **muito fraco**; o **VAL aguentava** → jogou **short** até ao LOD.
- **Problema (do próprio):** já eram **quase 16h local (~11:00 ET)** — entrada no **tail da janela**, a correr para o almoço.

**Execução:**
- Entrada 29257 · Stop 29418 (161 pts) · TP 28909.25 (novos lows).
- BE colocado na **wick do pré-market** (14:25 local). Levou **BE às 17:20** (~12:20 ET, hora de almoço).

**Métricas:** risco 161 pts; se TP = +2.16R; **saiu BE = 0R.**

**Resultado:** ⚪ **BE (0R).** Primeira não-vitória — mas gestão protegeu, não virou loss.

**Opinião (coach):** duas lições honestas, e tu já apontaste a principal:
1. **Timing.** Entrada ~11:00 ET, a rebentar para o almoço — o pior momento p/ momentum. Os teus 3 setups A+ foram todos **cedo na janela**; este foi no fim. **Regra a fixar: setup no tail da janela / a entrar no lunch = qualidade menor, ou passa.**
2. **Conviç​ão baixa.** Dia fraco, VAL a aguentar (obstáculo!), target "bastante longe" = RR e prob mais fracos. Era um **B-setup**, e veio depois de **3 no-plays seguidos** — cuidado com a comichão de "finalmente entrar". Aqui saiu barato (BE); é a lição perfeita ao preço mais baixo.

### Trade 5 — 10/07, long @ 29857.25 → TP1 + BE
**Contexto:**
- Range entre **PD POC e PD VAL** → a reação nesse range era o tudo.
- Plano pré-market: aceitação do **PD POC** → **long** até aos highs do dia anterior (≈ confluência com PD VAH). Em alternativa, aceitação **< PD VAL** → short p/ a wick feia das 10:00 + lows pré-subida.
- Confirmou-se o cenário long: aceitação do PD POC às 14:40.

**Execução:**
- Entrada 29857.25 · Stop 29797 (**60 pts** — tight) · TP1 29963.5 (50%) · TP2 29992.75.
- Só atingiu **TP1**; resto para **BE** (fecho acima da wick das 14:35). TP2 não veio.
- Às 15:30 uma candle absurda de ~280 pts (provável news).

**Métricas (R):** risco 60.25 pts; TP1 = +1.76R na 1ª metade; 2ª metade BE = 0R → **blended +0.88R**.

**P&L em $ (funded 25k, sizing mínimo = 2 MNQ p/ escalar):**
- Contrato 1 → TP1: +106.25 pts × $2 = **+$212.50** · Contrato 2 → BE: $0.
- Bruto **+$212.50**, líquido **≈ +$210** (após ~$2-3 comissão).
- ⚠️ Risco no stop = 60.25 × $2 × 2 = **$241 = 24% do buffer de $1.000** (Lucid 25k). Mesmo no mínimo p/ escalar, é agressivo p/ a 25k.

**Resultado:** ✅ **Win +0.88R (~+$210).** Modelo B, long em PD POC. Stop finalmente apertado — bom.

### Dia 12 — 14/07: 2 trades (1º loss + re-entry). Dia líquido −0.62R
**Contexto:** dia bullish. Ásia fez o LOD e gerou pump; Londres consolidou. PD POC era forte resistência mas foi **aceite** no pré-market → passámos a estar **acima do value**. Jogada mais provável: **longs no extremo do value** até ao **open semanal** (30041.5).

**Trade 6 — long @ 29785.25 → −1R (loss):**
- Stop 29685.25 (100 pts), TP 30041.5.
- **Erro (auto-identificado): stop demasiado curto** — devia estar **abaixo do PD POC**. Foi **wicked out** e depois o preço foi na direção certa.
- Lição: em aceitação de POC, o stop tem de ir **abaixo da estrutura (PD POC)**, não a meio do ruído.

**Trade 7 — long re-entry @ 29660.25 → +0.38R (win, fecho manual):**
- Stop 29493.5 (167 pts, agora **< PD POC** ✓ — o stop corrigido), TP 30041.5.
- Fechou **manualmente no VAH (29723.25)** às 17h — "não fazia sentido continuar na trade".

**Opinião (coach) — separar RESULTADO de PROCESSO:**
1. ✅ **Diagnóstico do stop certo.** Perceber que o loss veio de um stop curto (e corrigi-lo na 2ª entrada, abaixo do PD POC) é exatamente a resposta certa a um loss.
2. ⚠️ **Quebraste a regra 1-trade/dia**, motivado por "muito confiante na bias". Desta vez a bias estava certa e saíste com lucro — **e é precisamente por isso que é perigoso.** O outcome positivo reforça um hábito mau. A regra 1/dia existe para te proteger **nos dias em que a bias está ERRADA**; re-entrar após loss por confiança é o padrão que rebenta contas quando o mercado não colabora. **Não deixes o resultado validar o processo.**
3. 🟡 **Fecho manual a +0.38R.** Time-disciplinado (17h), mas desviaste do plano (TP 30041.5 / BE). Fechar tão pequeno logo a seguir a um loss pode ser "scared money" a querer travar qualquer verde. Vale a pena refletir: foi leitura ou foi medo?

**Nota prop:** 2 trades num dia = **2 mordidas no buffer de $1.000**. Um −1R + risco outra vez ⇒ na Lucid 25k isto aproxima-te do limite diário/MLL bem mais depressa. Mais uma razão para a regra 1/dia.

**Resultado do dia:** ❌ **−0.62R líquido.** Primeiro dia vermelho — gerido sem desastre, mas com uma quebra de regra a registar.
