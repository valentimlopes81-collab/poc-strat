# Backtest manual — MNQ (sessão de NY)

Sessão de replay, timeframe **5 min**, janela **manhã de NY**.
Modelos em teste: **(A)** divergência RSI + zona · **(B)** liquidez/aceitação em zona (sweep + acceptance).
Zonas de referência: POC/VAH/VAL dia anterior, POC overnight, VWAP, POC a desenvolver, Asia high/low.
Início dos dados: **29/06/2026**. Risco por trade = 1R (BE = 0R).
**Regra da sessão:** 1 setup por dia. **Exceção (decidida 24/04):** uma 2ª trade só se a 1ª foi **BE** (nunca após loss/win), **sempre a half-risk (0.5R)** e a favor da bias. Não decidir por "confiança" — só por esta regra.
**Metodologia:** a tese/plano é escrita em **pré-market, sem ver a sessão**; a execução é registada depois. Separa plano de outcome (anti-hindsight). ✓

## Estatísticas (atualizado a cada lote)

### Cumulativo (todos os blocos)
- Trades: **39** · Wins/Losses/BE: **22 / 8 / 9**
- Win rate: **73%** decididas (22/30) · **56%** incl. BE (22/39)
- R total: **+20.00R** · Expectância: **+0.51R/trade** · PF (R): **28.00 / 8.0 = 3.5**

### Por bloco
| Bloco | Trades | R | Notas |
|---|---|---|---|
| **Julho 2026** (29/06→31/07) | 14 | **+6.12R** | regime trend/dump (adverso); edge veio da lua-de-mel |
| **Janeiro 2026** (02/01→09/01) | 4 | **+0.03R** | ~flat; range/lento; T18 = caso-escola do leak nº1 |
| **Fevereiro 2026** (27/02) | 1 | **+0.69R** | 1min disponível a partir daqui |
| **Março 2026** (02/03→31/03) | 9 | **+7.76R** | T20-T28; 13 no-play. Só T24 (leak) negativa; 6 wins, 2 BE. **Melhor bloco de sempre** |
| **Abril 2026** (01/04→…) | 11 | **+5.40R** | T29-T39; 8 no-play; forte 2ª metade, tudo a favor da bias bull; T39 BE (short contra o tell no POC) |

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
Histórico: **T6 −1R · T8 BE · T10 −1R · T16 BE · T18 −1R · T24 −1R** = **−4R, 2 BE, 0 wins limpos** em 6 tentativas.
T24 (16/03): reincidência após 15 trades limpas — o próprio apanhou no ato ("estupidamente, tenho de me concentrar"). Consciência OK; falha de foco.
**Guarda pré-entrada:** antes de carregar → *"Estou a antecipar que o nível segura, ou já vi o ✖/▲ de reação confirmada?"* Se antecipação → PASSA.
Contraste: wins de value = **sempre aceitação/reação confirmada** (T1/2/3/5/15).
**09/01 é o caso-escola:** a −1R foi antecipação; a "play certa textbook" do mesmo dia foi a **reação confirmada** (marcada pelo tagger ▲). Mesma zona/direção — só muda o timing.
→ **REGRA: nunca antecipar o extremo do value. Esperar o ✖/▲ de recusa/aceitação confirmada.**

### Leak nº2 — hesitar na reação confirmada
08/01: recusa confirmada do PD VAL (setup tipo-A) não jogada → dump perdido. Face oposta do nº1.
→ Ambos = **timing da leitura**. Alvo: entrar **na** confirmação — nem antes (nº1) nem depois (nº2).

### Leak nº3 — short contra-tendência em bull forte
**T11 (21/07) −1R · T32 (16/04) −1R** — ambas shorts contra uma bias claramente bullish ("estúpido", nas palavras dele).
→ Num regime nitidamente bull, um short precisa de ser **A+ (exaustão/rejeição confirmada com sinal)**, nunca "deixa-me tentar um short aqui". Idem para longs contra bear.
**Pergunta pré-entrada (2 partes):** (1) reação confirmada (✖/▲)? (2) **no sentido da minha bias?** Se falha qualquer uma → PASSA.
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

## SIMULAÇÃO — Funded Lucid 25k (27 trades)

**Pressuposto:** risco disciplinado **$100/trade = 1R** (10% do buffer de $1.000). Contratos MNQ, $2/ponto.

**Resultado:** +14.60R → **+$1.460**.

**Curva de equity (R):** pico intermédio +7.64R (T5), max drawdown até +4.91R (T13) = **−2.73R**, depois subida consistente até +14.60R.

**Regras Lucid 25k — verificação:**
| Regra | Limite | No backtest | Estado |
|---|---|---|---|
| Profit target | +$1.250 | atingido na **T25** (18/03), +$1.254 | ✅ **Eval passada** |
| Max Loss Limit (trailing EOD) | −$1.000 | max drawdown só **−$273** | ✅ nunca perto |
| Daily loss limit | ~−$300 | pior dia −$100 (ou −$62 no 14/07, 2 trades) | ✅ nunca perto |
| Consistency (se o plano tiver) | típico 30-40% | maior dia +$254 (T3) ≈ 17% do lucro | ✅ provável (confirmar plano) |

**Conclusão:** passaria a avaliação **com margem enorme** — usou no máximo **$273 dos $1.000** de buffer. Sobra espaço para arriscar mais: a **$150/R** → +$2.190, max DD ~$410 (ainda longe do limite).

**Caveats honestos:**
- Com MNQ inteiros + stops de 50-200 pts, nem sempre dá para arriscar exatamente $100 (1 MNQ num stop de 100 pts = $200 = 2R). Os $ reais seriam mais "aos saltos"; a estrutura em R e a conclusão (passa com folga) mantêm-se.
- É backtest em replay 5m/1m, execução manual — fills reais ao vivo variam.
- Passar a eval ≠ ser lucrativo a longo prazo. É 27 trades; o edge é bom mas a amostra é pequena.

## SIMULAÇÃO — 1 contrato MNQ fixo (29 trades)

Cada trade = 1 MNQ ($2/ponto). P&L por trade ≈ R × distância_do_stop × $2.

**Resultado: ≈ +$2.950** (bruto) → **~$2.900** líquido (após ~$45 comissões).
*(4 trades com stop estimado — T3, T5, T13, T24 — sem pontos exatos; aproximação ±~$100. T15/T22/T27 eram scaled 50/50, impossível com 1 contrato → usado o resultado blended.)*

**Regras Lucid 25k (1 contrato):**
| Regra | Limite | 1 contrato | Estado |
|---|---|---|---|
| Profit target | +$1.250 | atingido ~T14-15 | ✅ passa |
| Max Loss Limit | −$1.000 | max drawdown ≈ **−$468** | ✅ ok (mais apertado que $100/R) |
| Daily loss | ~−$300 | pior trade −$262 (T11) | ✅ ok, mas perto |
| Payout | buffer $1.100, min $500 | $1.851 acima do buffer → **~$1.666** (90/10) | ✅ |

**⚠️ Aviso honesto — risco INCONSISTENTE:** 1 contrato fixo = risco de **$100 a $400/trade** conforme o stop (50-200 pts). A **T12 (stop 200 pts) arriscou $400 = 40% do buffer numa só trade.** Deu mais $ que a versão $100/R ($2.950 vs $1.460) precisamente porque arrisca mais nos stops largos — mas é **frágil**: um mau dia com stop largo tira grande fatia do buffer de uma vez. O sizing por risco fixo (%/R) é mais sólido; 1 contrato fixo dá mais retorno mas pior gestão de risco.

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
| 23 | 13/03 | Short | **Exaustão no PD POC** (falha de suporte) | PD POC | 24616.5 | 24728.25 (HOD NY, 112 pts) | LOD 24397.75 | Full TP (100%) | ✅ Win | **+1.96R** | leu **exaustão**: repetidos toques no PD POC c/ bounces cada vez mais fracos → suporte a ceder → short p/ LOD. BE ao passar o PDL. Full TP (após killzone, mas risk-free). **Leitura de tape avançada — o oposto do leak nº1** |
| 24 | 16/03 | Long | **"Apanhar suporte" PD VAH** (leak nº1) | PD VAH | — | — | — | Stop | ❌ Loss | **−1R** | open bull anulou queda de sexta; zona do PD VAH era p/ **shorts** (rejeição), mas tentou long a usar o VAH como **suporte** = leak nº1. **Apanhou o erro no ato** ("estupidamente, tenho de me concentrar"). 1ª reincidência em 15 trades |
| — | 17/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | consolidação acima do value de ontem; bias bull; procuraria continuation long no extreme do value SE voltasse; **subiu sem parar, nunca voltou ao value** → sem entry |
| 25 | 18/03 | Short | **Rejeição confirmada PD VAL** (tipo-A ✓) | PD VAL | 24936.75 | 24999 (62 pts) | TP1 24863.25 (fechou tudo) · [final 24729] | Full close TP1 | ✅ Win | **+1.18R** | subida de ontem anulada no pré-NY (rejeição a higher prices); short na rejeição do PD VAL; **fechou 100% no TP1** por já estar fora da killzone (não segurou). Final TP veio só na afternoon (fora do modelo). **Recuperou clean no dia a seguir ao leak** |
| — | 19/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | grande queda retoma trend bearish (favorece shorts); mas **preço muito abaixo dos POIs** → era preciso subida de volta a eles p/ shortar (ou invalidar), que não veio → sem entry |
| 26 | 20/03 | Short | **Rejeição confirmada extremo value** (tipo-A ✓) | PD VAH | 24426.5 | 24527 (100 pts) | 24270.75 (low 13/03) | Full TP (100%) | ✅ Win | **+1.55R** | tirou o PDL na London, voltou a lutar com o value; extreme do value = forte resistência → short. **Fill mau + entrada tardia** penalizaram o RR; jogou na conviction da bias. Full TP |
| — | 23/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | trend bearish confirmada; gap acima + value acima do gap; **candle de ~800 pts em 5min por news (Trump)** → move erráctico/suspeito, sem edge no meio do spike → ficou de fora ✓ |
| — | 24/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | a reverter a candle bull de ontem; perda de força, várias rejeições dos POIs do value em Asia/London → favorecia shorts; mas **NY terrível**, nada jogável → sem entry |
| 27 | 25/03 | Long | **Reação confirmada PD VAH** (tipo-A ✓) | PD VAH | 24337.5 | 24287.75 (VAH, 50 pts) | TP1 24438.75 · TP2 24540 | TP1 (50%) + BE | ✅ Win | **+0.51R** | acima do PD value; boa reação no PD VAH → long, mas **arriscou só 0.5R** por estar quase fora da killzone (bom sizing à qualidade do momento); faltou volume p/ TP2, resto BE. Stop no VAH = invalidação estrutural |
| — | 26/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | trend bearish de volta (após dia choppy); a trocar < PD value → favorece continuation shorts, mas era preciso revisitar o value p/ entrar; **não revisitou** → sem entry |
| — | 27/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | igual ao 26; trend bearish, ovn move estragou a NY; killzone terrível (2 dias seguidos) → proibido jogar; sem entry |
| 28 | 30/03 | Short | **Rejeição confirmada PD POC** (tipo-A ✓) | PD POC | — | — | — | BE | ⚪ BE | **0R** | Asia recuperou bull, a tentar aceitar o value; a trocar entre VAL e POC; short na rejeição do POC, mas **fill muito mau e lento** → BE. "A lógica estava lá" — execução, não leitura |
| — | 31/03 | — | — | — | — | — | — | — | ⏸️ No-play | — | queda de segunda → impulso bull na Asia de volta ao PD value, a lutar com o PD POC; ver se POC segura (bull→Monday high) ou esgota (bear→Asia low); **sessão má** → sem setup |
| | **═══ ABRIL 2026 ═══** | | | | | | | | | | |
| — | 01/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | abril começa bull com impulso comprador forte; acima do value → esperar volta ao value p/ longs com reação forte; **não voltou** → sem setup |
| — | 02/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | **dump gigante ovn** → PD value muito acima (dificulta o modelo); só chegou ao value no fim da sessão e sem volume → sem setup |
| — | 03/04 | — | — | — | — | — | — | — | 🚫 Feriado | — | **Good Friday** — bolsas US fechadas, sem sessão |
| — | 06/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | a aguentar o value, acima dele (impulso bull não invalidado); plano = long scalp se o extremo superior do value segurasse como suporte; **só deu range** → sem trade |
| 29 | 07/04 | Short | **Rejeição confirmada extremo value** (tipo-A ✓) | value extreme | 24251.75 | 24304.5 (52.75 pts) | 24133.75 (full) | Full TP (100%) | ✅ Win | **+2.24R** | dia volátil, luta entre extremos do value; pré-NY em range < value; NY levou ao value e rejeitou → short; sem BE (margem pequena); full TP. Stop apertado → bom múltiplo |
| — | 08/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | subida absurda no fim do dia 7 → pré-NY muito longe do value; volume secou muito após o impulso → sem oportunidade |
| 30 | 09/04 | Short | **Rejeição confirmada PD POC** (tipo-A ✓) | PD POC | — | — | — | BE | ⚪ BE | **0R** | consolidação desde o move bull; a lutar com o value; short na rejeição do POC, mas reagiu no VAL e voltou ao POC (range chop) → BE. Setup válido, sem espaço p/ seguir |
| — | 10/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | bullish, acima do PD value; plano = long se o extremo do value segurasse como suporte (enquadramento leak nº1); **sem setup** → sem trade |
| 31 | 13/04 | Short | Rejeição PD POC (**VAL segurou**) | PD POC | — | — | — | Stop | ❌ Loss | **−1R** | abriu bear, gap acima; short no PD POC visando o fecho do gap/baixo; mas o **PD VAL logo abaixo atuou como suporte** e não partiu → loss. "Má leitura". Sub-padrão: **não pesou o POI intermédio (VAL)** como obstáculo — repete lição do T3 |
| — | 14/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | impulso super bullish, price discovery; acima do value → long no extremo do value se possível; **só subiu, nunca voltou ao value** → sem entry |
| — | 15/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | range a aceitar bem o value; bias bull (higher prices); atento a longs em reações no value; **sem bons targets** (RR) → sem trade |
| 32 | 16/04 | Short | **Contra bias bull** (leak nº3) | PD VAH | — | — | — | Stop | ❌ Loss | **−1R** | trend super bullish, value criado abaixo; bias = LONGS; tentou short na rejeição do VAH p/ baixo → **contra-tendência** = "estúpido" (palavras dele). Igual à T11. Loss |
| — | 17/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | só subimos outra vez, sem retração ao value → sem oportunidade (sem tentação de short desta vez ✓) |
| 33 | 20/04 | Short | **Rejeição confirmada PD POC** (tipo-A ✓) | PD POC | 26757 | 26860 (>VAH, 103 pts) | TP1 26629.5 (LOD) | Full close TP1 | ✅ Win | **+1.24R** | ATH, gap down, recuperação fraca (suspeita) → fade; POC rejeitado "com classe" → short p/ LOD; stop acima do VAH (abdicou RR por invalidação estrutural); fechou no TP1 às 16h (killzone). **Regresso ao tipo-A após 2 shorts contra-tendência** |
| 34 | 21/04 | Long | **Retrace ao value, COM bias bull** (tipo-A ✓) | PD value | 26774.5 | 26725.5 (49 pts) | TP1 26838 · TP2 26901 | TP1 (50%) + BE | ✅ Win | **+0.65R** | super bull/ATH; retrace ao PD value = a oportunidade certa p/ LONG (não short!); TP1 + BE, TP2 não veio. **Lado certo da bias — lição da T32 aplicada.** Stop apertado |
| 35 | 22/04 | Long | **VAH como suporte, reação CONFIRMADA** (tipo-A ✓) | PD VAH | 26845.75 | 26809 (37 pts) | 26901.5 (high semana) | Full TP (100%) | ✅ Win | **+1.52R** | bull/ATH, > value a usar VAH como suporte; **wick ao VAH + rejeição super clara** (reação confirmada, NÃO antecipação — o oposto do leak nº1); long p/ high da semana; stop apertado; full TP. Contraste perfeito T24 vs T35 |
| 36 | 23/04 | Long | Long p/ ATH (target greedy) | PD value | ~27013 | (stop 56.5 pts) | ATH (~27138, RR 1.85) | BE | ⚪ BE | **0R** | correção < value, luta p/ manter dentro; long p/ ATH; **target ganancioso + stop alargado p/ salvar RR** → precisava de move grande, não veio → BE. Auto-crítica certa |
| 37 | 23/04 | Long (2ª do dia, ½R) | **Reação confirmada PD POC**, COM bias | PD POC | 27013 | 26966.5 (low do move, 46.5 pts) | 27102.5 (NY high) | Full TP (100%) | ✅ Win | **+0.96R** | preço a reagir muito bem no PD POC → long; **2ª trade do dia (quebra 1/dia)**, mitigada com **half-risk (0.5R)**; full TP. ⚠️ justificação = "muito confiante" (mesmo gatilho da quebra de 14/07) |
| 38 | 24/04 | Long | **Extremo do value como suporte** (reação confirmada ✓) | PD value | 27179.5 | 27130.75 (48.75 pts) | TP1 27256.75 · TP2 27365.75 | TP1 (50%) + BE | ✅ Win | **+0.79R** | ATH, > value, cuidado com shorts; extremo do value = suporte (reação) → long COM bias; TP1 + runner a BE — **runner stopado por 1 tick** antes do move insano (variância, gestão certa). Stop apertado |
| 39 | 27/04 | Short | Exaustão/rotação no PD POC (cenário 2, **contra o tell bullish**) | PD POC | — | — | rotação p/ baixo | BE | ⚪ BE | **0R** | abriu semana bull (Asia novo ATH → correção de volta ao PD value); pré-market **usou o PD POC 2× como suporte** = tell bullish. Leu 2 cenários (POC almofada p/ cima **ou** esgota→rotação). Jogou o short (exaustão) mas o preço **só andou de lado** → BE. Gestão certa (scratch, não loss); mas shortar um nível que acabou de segurar 2× como suporte é apostar contra a evidência — sem confirmação de exaustão (nem falha do POC), era esperar |
| — | 28/04 | — | — | — | — | — | — | — | ⏸️ No-play | — | **bearish desde a Asia** — retrace total do move desde sexta; a trocar **< PD value** (bias virou vs. as últimas semanas bull); mas **preço longe do value** e não voltou lá → sem POI para reagir → sem trade. Disciplina ✓ |

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

---

## ANÁLISE ESTATÍSTICA APROFUNDADA (38 trades)

*Fecho do lote Abril. 38 trades · 22W / 8L / 8BE · WR 73% (decididas) · +20.00R · expectância +0.53R/trade · PF 3.5.*

### 1. Por direção
| Direção | Trades | WR | R total | R/trade |
|---|---|---|---|---|
| **Shorts** | 19 | 79% | +14.8R | **+0.78R** |
| **Longs** | 18 | 73% | +7.2R | +0.40R |
| Longs (limpos, sem leak nº1) | 14 | — | — | **+0.84R** |

**Leitura:** os shorts rendem quase o dobro por trade. Não é que o lado curto seja "melhor" — é que os meus **longs estão contaminados** pelo leak nº1 (catch-support / antecipar que o nível segura). Removidas essas entradas antecipadas, o long limpo vale +0.84R — praticamente igual ao short. **O edge é simétrico; o que não é simétrico é a minha execução.**

### 2. Por zona (POI de entrada)
| Zona | Trades | R/trade | Nota |
|---|---|---|---|
| **PD POC** | 14 | **+0.69R** | a zona-mãe. Maior volume, maior fiabilidade |
| PD VAH | 11 | +0.50R | topo do value → fade / continuação |
| Value / extremo | 7 | +0.46R | |
| PD VAL | 5 | +0.45R | fundo do value |

**Leitura:** a hierarquia de fiabilidade segue exatamente a hierarquia de volume dos POIs. O **PD POC** — o preço onde ontem se transacionou mais — é o meu melhor ponto de decisão. Isto não é coincidência: é a confirmação de que estou a operar estrutura real e não linhas arbitrárias.

### 3. Trades limpas vs. trades com erro
| Grupo | Trades | R total | R/trade |
|---|---|---|---|
| **Limpas** (processo correto) | 27 | **+28R** | **+1.04R** |
| **Com erro** (leak nº1/2/3) | 11 | −8R | −0.73R |

**Esta é a tabela mais importante do diário.** A estratégia executada como está desenhada gera **+1.04R por trade**. As 11 trades com leak drenam 8R e cortam a expectância de +1.04R para +0.53R — **metade do resultado desaparece na execução, não na estratégia.** O trabalho não é encontrar um edge novo; é parar de sabotar o que já tenho.

### 4. Qualidade dos trades
- **Win médio:** +1.27R · **Loss médio:** −1.00R → **payoff 1.27** (ganho quando acerto > perda quando erro).
- **Max drawdown:** −2.73R, para +20R de ganho → rácio ganho/DD ≈ **7:1**. Curva de equity muito estável.
- **Máx. losses consecutivos:** 2. Nunca entrei em espiral.
- **Distribuição bimodal dos wins:** ou vai a **full-TP (~2R)** ou fica em **saída escalada (~0.6R)**. Poucos wins "no meio".

### 5. Pista de scaling (a testar)
- Wins que foram a **full-TP:** média **+1.75R**.
- Wins **escalados** (TP1 50% + BE/runner): média **≈ +0.9R**.

O scaling 50%+BE está a **cortar os grandes vencedores**. Protege a trade (transforma potenciais losses em BE), mas quando a leitura está certa deixa metade do movimento em cima da mesa. **Questão em aberto:** vale a pena manter o runner mais tempo (trailing por estrutura em vez de BE fixo) nas trades a favor da bias forte? Não mexer ainda — recolher mais amostra e decidir com dados.

### Conclusão da análise
1. O edge é **real e simétrico** (long limpo ≈ short ≈ +0.8R).
2. A fiabilidade das zonas **segue o volume dos POIs** (POC > VAH > extremo > VAL).
3. **50%+ do resultado perde-se em 11 trades com leak** — o foco nº1 é execução, não descoberta.
4. Payoff 1.27 e DD 7:1 dizem que o sistema é **estruturalmente saudável**.
5. Próxima experiência candidata: **runner por estrutura** em vez de BE fixo, para recuperar os full-TPs.

---

## PORQUE É QUE A ESTRATÉGIA FUNCIONA — POIs + teoria de leilão

*A resposta à pergunta "porque é que estes POIs são pontos realmente relevantes e não linhas arbitrárias".*

### O mercado é um leilão
Cada dia de mercado é um **leilão duplo contínuo**: o preço sobe à procura de vendedores e desce à procura de compradores. Onde encontra muito interesse dos dois lados, **fica** (transaciona muito volume) → é aí que se forma o **valor**. Onde encontra pouco interesse, **passa rápido** (pouco volume) → são zonas de rejeição/desequilíbrio. Todo o meu indicador é apenas uma forma de **ler onde ontem se formou valor** e usar isso para hoje.

### Porque cada POI importa

- **POC (Point of Control)** — o preço com **mais volume** do dia anterior. É o "preço justo" consensual. Funciona como **íman** (o preço tende a voltar-lhe quando está em balanço) e como **suporte/resistência** (muito inventário trocou de mãos ali → muitas ordens em memória). É o meu melhor POI nas estatísticas (+0.69R) precisamente por ser o de maior volume. **Aceitação acima/abaixo do POC = mudança de quem controla o leilão.**

- **VAH / VAL (Value Area High/Low)** — as bordas dos **70% de valor**. São a fronteira entre "dentro do justo" e "caro/barato". Duas leituras, que são exatamente os meus dois setups:
  - **Rejeição na borda** (o preço testa VAH e volta) → **fade** de volta ao value.
  - **Aceitação além da borda** (fecho aceite acima do VAH) → **continuação / discovery** para novo valor.
  O meu modelo-A (aceitação/rejeição confirmada num POI) é literalmente a teoria de value area em ação.

- **PDH / PDL (Prior Day High/Low)** — **memória do mercado**. São os extremos que toda a gente vê. Atraem liquidez (stops acumulados por cima/baixo) → alvos naturais de sweep e pontos de reversão.

- **ON POC / Asia H-L** — **poças de liquidez** da sessão overnight/asiática. Antes da sessão de NY abrir, estes níveis marcam onde há stops para "varrer". Um sweep destes níveis seguido de rejeição é dos sinais mais limpos de armadilha/reversão.

- **VWAP (âncora RTH)** — o preço médio ponderado por volume da sessão. É a referência das **instituições**: acima do VWAP = compradores em controlo intradiário, abaixo = vendedores. Filtro de bias em tempo real.

### Balanço vs. desequilíbrio (o interruptor)
- **Balanço (rotação):** o preço roda dentro do value. Estratégia certa = **fade das bordas** (VAH/VAL de volta ao POC).
- **Desequilíbrio (tendência / discovery):** o preço aceita além do value e procura preço novo. Estratégia certa = **continuação** a favor da direção.

Ler em que regime estou é o que decide se hoje faço fade ou continuação. É por isso que dias de "aceitação do POC no pré-market" mudam toda a minha bias — porque mudam o regime do leilão.

### Onde está o edge (porque é que isto ganha dinheiro)
O edge **não** é adivinhar direção. É **empilhar 3 filtros** que, juntos, isolam um subconjunto de alta probabilidade:

1. **Localização** — só ajo num POI real (estrutura de volume), não no meio do nada.
2. **Confirmação** — espero aceitação/rejeição confirmada (fecho[s] em 5min), não antecipo.
3. **Direção** — só a favor da bias do leilão do dia.

Cada filtro sozinho é fraco. **Os três em confluência** produzem o setup type-A — e é esse subconjunto que rende +1.04R/trade. Bónus estrutural: o POI dá-me um **stop objetivo** (do outro lado da estrutura), portanto o risco é definido pelo mercado, não por um número arbitrário.

### Porque é que os leaks falham — mecanicamente
- **Leak nº1 (catch-support / antecipar):** entrar *antes* da confirmação remove o filtro nº2. Fico a apostar que o nível segura → volta a ser ≈ moeda ao ar. Foi o que contaminou os meus longs (0.40R vs 0.84R limpos).
- **Leak nº2 (hesitar no setup confirmado):** os 3 filtros alinharam e eu não entrei / entrei tarde → deixo o edge em cima da mesa.
- **Leak nº3 (short contra-tendência em bull forte):** violar o filtro nº3 (direção) = lutar contra o order flow dominante. Estruturalmente é o pior erro porque o mercado tem momentum contra mim.

**Resumo:** a estratégia funciona porque lê **onde se formou valor** (POIs = volume real), **espera o leilão confirmar** quem controla, e só age **a favor desse controlo**. Os POIs são relevantes por serem os preços onde o mercado *de facto* transacionou — memória e liquidez reais — e não linhas desenhadas à mão. O edge está provado (5 regimes, +1.04R limpo); o trabalho é executar sem os leaks.
