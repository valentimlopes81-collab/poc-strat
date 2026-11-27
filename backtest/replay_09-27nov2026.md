# 🔁 Replay diário — 09/11 a 27/11/2026 (treino/backtest)

*Última trade real registada: L37 (06/11, loss, `mnq_journal.md`) — conta FUNDED LIVE encerrada
nesse mesmo dia. Desde então sem trading ativo. Este ficheiro condensa, dia a dia, o que
`quant_bias.md` tinha registado em cada sessão (bias, regime, níveis) e o que de facto aconteceu
intradiário (via os "Alerta horário" do próprio dia) — para replay mental/backtest dos dias fora
do mercado. Fonte: `backtest/quant_bias.md`. 26/11 (Ação de Graças) incluído como nota breve —
mercado de ações fechado, sem sessão NQ.*

---

## 09/11

**Regime:** NQ mean-reverting leve (Hurst 90d 0,65). GEX NQ **virou positivo (-1,37B→melhor da semana)**, regime a acalmar após o crash de 05/11. BTC ainda trending forte (0,59), GEX ainda negativo mas leve (-45,4M).

**NQ:** Call Wall full+0DTE convergidos em 665 QQQ (~27.273 NQ), exatamente no preço — pin/resistência imediata. Put Wall 650 QQQ (~26.657 NQ), mais longe que no resto da semana. Zero-gamma 674,7 QQQ (~27.672 NQ). Max pain 660 QQQ. VIX 23,21 (-9,5%), "elevado/cauteloso" mas a arrefecer (4ª sessão seguida a cair: 28,11→26,81→26,27→23,21).

**BTC:** spot ~74.548-74.933, GEX -45,4M. Put Wall 74.000 — mesmo nível do spot, zona crítica.

**Catalisadores:** FOMC sem novidade desde 28/10; odds de hike em dezembro ficaram mais incertas no pricing; COT inutilizável (ago/set).

**O que aconteceu (answer key):** NQ rompeu com força o 665 e o zero-gamma do dia (15:34, preço ~27.816) — nova parede dominante 674 QQQ (~27.773 NQ). GEX continuou a melhorar toda a tarde (-1,19B→-1,01B→-1,09B→-1,23B). Formou-se um pin forte em 677-678 QQQ no fecho (full dataset e 0DTE ambos +5,6M). **Veredito: recuperação confirmou-se de forma limpa, a melhor sessão da semana.**

---

## 10/11

**Regime:** NQ mean-reverting leve (0,67, igual à semana). BTC trending forte (0,61). GEX de ambos reverteu para negativo durante a noite após o fecho forte de ontem — digestão/pullback sem catalisador de notícia confirmado.

**NQ:** GEX total -3,63B (de -1,23B no fecho de 9/11). Call Wall 700 QQQ (~28.846 NQ), longe. Put Wall estrutural 650 QQQ (~26.785 NQ). 0DTE Put Support dominante em 670 QQQ mas **fraco** (-1,34M) — mesmo nível do preço, sem convicção a defendê-lo. Zero-gamma 684,7 QQQ. VIX 21,06 (+5,7%), "elevado/cauteloso".

**BTC:** spot ~73.764. GEX -83,3M (de perto de zero ontem). Put Wall 74.000, muito perto do spot (zona crítica, mas confiança mantida Baixa-Média, não Alta — lição de 05/11).

**Catalisadores:** CPI/PPI de outubro saem esta semana (datas não confirmadas); Fed/Warsh sem atualização de pesquisa desde meados de junho.

**O que aconteceu (answer key):** Dia de **4 reversões de Call/Put Wall** ao longo da tarde — Call Wall colapsou de 700→672 (14:34), preço rompeu-o e criou novo Put Wall em 675 (15:34), recuou e sentou-se nele (16:34, GEX -3,70B), continuou a cair e aproximou-se do novo Put Wall 670 (17:34, só ~13pts, GEX pior do dia -3,99B), depois estabilizou e o 670 dissolveu-se, Put Wall voltou a 650 (18:34). **Veredito: dia de chop genuíno, sem lado dominante — 4 reversões estruturais em poucas horas, GEX a piorar monotonamente até às 17:34 e a estabilizar no fecho.**

---

## 11/11

**Regime:** NQ mean-reverting leve (0,67). BTC trending leve (0,61), igual à semana.

**NQ:** **Gap overnight notável** (+2,7% desde o fecho de ontem). GEX **reverteu para positivo (+336M)** — mudança de regime real. Preço sentado **exatamente no zero-gamma** (686,5 QQQ/~28.316 NQ, só ~60pts acima) — pivot genuinamente frágil. Call Wall 700 QQQ, Put Wall 650 QQQ, ambos longe. 0DTE Gamma Wall dominante 690 QQQ (call-heavy, resistência próxima). VIX 18,33 (-5,8%), "normal".

**BTC:** spot ~73.441-73.628. GEX -108M, sem mudança de regime — ainda entre o Put Wall (72.000) e o zero-gamma (75.815), mesma zona frágil de ontem.

**Catalisadores:** Kevin Warsh confirmado Fed chair; mercado a precificar ~88% hike em dezembro (fonte secundária); COT real via CFTC: leveraged funds net LONG +10.417 (3,0% OI) — viés especulativo de alta; PPI amanhã (13/11) é o catalisador real.

**O que aconteceu (answer key):** Preço aproximou-se do zero-gamma (15:34, só ~19,5pts, GEX a esmorecer +118M) e depois **rompeu com força para cima** (16:34, cruzou o 690, GEX explodiu para +997M) — Put Wall estrutural saltou de 650 para 680. GEX continuou a reforçar-se até +1,62B (18:34), Gamma Wall 0DTE subiu de 690 para 695. **Veredito: dia claramente bullish, regime de pin a ganhar força ao longo da tarde — zero-gamma como pivot resolveu-se para cima, confirmando o cenário de continuação.**

---

## 12/11

**Regime:** NQ mean-reverting leve (0,65). BTC trending leve (0,67) — depois mudou para neutro/random walk no dia seguinte.

**NQ:** **Reversão brusca overnight** — GEX voltou a -3,03B (de +1,68B no fecho de ontem), a pior reversão desde 10/11. Preço caiu ~580pts e aterrou **exatamente no novo Put Wall (680 QQQ/~28.060 NQ)** — teste crítico imediato, só ~28pts de distância. Zero-gamma subiu para 691,8 QQQ, bem acima — regime negativo confirmado. 0DTE inverteu para Put Support dominante (685). VIX 18,88 (+7,9%), ainda "normal".

**BTC:** spot ~72.006-72.933. GEX -138M. **Preço sentado exatamente no Put Wall (72.000)** — teste direto, não só proximidade.

**Catalisadores:** Fed: próxima decisão 9/12; mercado ~85-88% hike (CME FedWatch, fonte secundária); PPI sai amanhã.

**O que aconteceu (answer key):** Dia de **4 reversões de regime GEX em <24h** — recuperou do Put Wall e cruzou de volta para cima o 0DTE (15:34, GEX -2,32B), rompeu o zero-gamma e **GEX virou positivo** (16:34, +414M, 3ª reversão), depois voltou a cruzar o zero-gamma para negativo (17:34, -1,12B, 4ª reversão), preço a ~5,5pts do novo Gamma Wall 0DTE (690), Put Wall subiu para 685. **Veredito: réplica do caos de 10/11, mas ainda mais extremo — GEX oscilou positivo↔negativo 4x no mesmo dia, zero-gamma como fronteira instável.**

---

## 13/11

**Regime:** NQ mean-reverting leve (0,67). BTC passou a **neutro/random walk (0,67 mas VR inconsistente)** — perdeu direcionalidade.

**NQ:** depois do caos de ontem, **estabilizou** — GEX -756M, bem mais contido. Preço entre Put Wall 685 QQQ (~28.235 NQ, também 0DTE dominante) e zero-gamma 692,0 QQQ (~28.522 NQ), sem testar nenhum dos dois de perto. VIX 17,97 (-3,9%), "normal".

**BTC:** spot ~69.239-69.295, caiu ~3,8% desde ontem. **Put Wall desceu de 72.000 para 70.000 — e o preço está ABAIXO dele** — perda de suporte estrutural, não só teste.

**Catalisadores:** PPI de outubro saiu hoje 13:30 UTC (resultado não confirmado via pesquisa); Fed sem mudança (~85-88% hike dezembro).

**O que aconteceu (answer key):** **Quebra forte às 15:34** — preço caiu ~700pts, rompeu de forma limpa o Put Wall (685→680, novo nível já ~224pts abaixo do preço), GEX despenhou para -3,98B (>5x pior que o briefing). Materializou-se exatamente o cenário de risco do dia ("perda do Put Wall reabre vulnerabilidade, próximo nível real é o 650"). **Veredito: dia calmo na manhã, quebra estrutural clara na tarde — o cenário bearish ficou escrito no próprio briefing e cumpriu-se à letra.**

---

## 16/11 (segunda-feira; sexta 13/11 fechou em quebra)

**Regime:** NQ mean-reverting leve (0,67). BTC mean-reverting leve (0,57).

**NQ:** GEX **-3,30B**, tão negativo como o fecho de sexta (-3,98B) — regime de alta vol manteve-se durante o fim de semana. Antigo Put Wall (680 QQQ) agora ACIMA do preço, funciona como resistência overhead. Nível acionável: Put Support/0DTE 670 QQQ (~27.620 NQ), só ~70pts abaixo. Zero-gamma 686,6 QQQ, longe. VIX 20,36 (+5,5%), primeira leitura **"elevado/cauteloso"** em vários dias.

**BTC:** spot ~65.160-65.212. GEX -98,7M. Preço entre Put Wall (65.000) e zero-gamma (70.610), mesma zona frágil.

**Catalisadores:** **NVDA earnings amanhã 17/11 após o fecho** — catalisador maior da semana, com transição de CEO (Jensen Huang saiu 12/11, Colette Kress interina) ainda por digerir.

**O que aconteceu (answer key):** **Rompeu o Put Support 0DTE (670) às 15:34** — GEX piorou para -4,11B. Depois recuperou parcialmente e o Put Wall convergiu com o 0DTE em 670 (16:34, GEX -4,26B, pior do dia). No fecho, Put Wall voltou a subir para 680, desconvergiu do 0DTE (agora em 665), GEX melhorou ligeiramente para -3,99B. **Veredito: dia de compressão/indecisão pré-NVDA, como esperado — estrutura instável (walls a convergir/divergir) mas sem direção clara resolvida, exatamente a espera de catalisador identificada no briefing.**

---

## 17/11

**Regime:** NQ mean-reverting leve (0,63). BTC quase neutro (0,53, mean-reverting muito leve).

**NQ:** GEX -2,41B, regime mantido mas menos extremo que os picos de ontem à tarde. Put Wall mais forte da cadeia: 650 QQQ (~26.795 NQ), ~567pts abaixo. 0DTE: Put Support 659 QQQ e Call Resistance 669 QQQ, preço a meio dos dois — **sem lado dominante**. VIX 22,89 (+15,1% vs média 20d), "elevado/cauteloso", subiu 2ª sessão seguida.

**BTC:** spot ~64.816,79. GEX -102,9M. Put Wall 64.000 coincide com max pain, ~1,3% abaixo do spot — suporte imediato a vigiar.

**Catalisadores:** **NVDA earnings hoje após o fecho** (catalisador dominante); Fed confirmado em regime de **hike** (não corte) — subiu em set/26, manteve 3,75-4% a 28/10 (10-2, 2 dissidências a favor de subir mais), projeções oficiais 4,1-4,4%, próxima reunião 8-9/12.

**O que aconteceu (answer key):** **Rompeu o Put Support 0DTE (659) às 15:34** (GEX piorou para -3,30B), continuou a cair e aproximou-se do Put Wall estrutural 650 (16:34, só ~175pts, GEX -3,67B), no fecho a 0DTE colou-se de volta ao preço em 655 (18:34, GEX -3,93B, pior do dia, GEX 0DTE isolado -804,8M e a deteriorar). **Veredito: dia claramente bearish e em deterioração constante durante toda a tarde — pior fecho da semana, véspera do NVDA com tensão a acumular-se, não a aliviar.**

---

## 18/11

**Regime:** NQ mean-reverting leve (0,60, ligeira descida). BTC mean-reverting leve (0,55).

**NQ:** GEX -1,66B, **melhorou muito** vs o -3,93B do fecho de ontem. Put Wall 650 QQQ, agora ~435pts abaixo (distância confortável). **0DTE de hoje nasceu POSITIVO (+211,4M)** — mudança de regime notável. Gamma Wall/Call Resistance 0DTE em 664 QQQ. VIX 24,28 (-4,6% no dia mas +19,1% vs média 20d), "elevado/cauteloso", valor mais alto da semana apesar da queda intradiária.

**BTC:** spot ~63.796. GEX -117,1M. **Put Wall 64.000 muito perto do spot, só ~1,3% abaixo** — suporte imediato mais próximo da semana.

**Catalisadores:** NVDA earnings já saíram ontem à noite — reação ainda não confirmada com clareza pela pesquisa; FOMC minutes e retail sales esta semana (datas não confirmadas).

**O que aconteceu (answer key):** 0DTE **oscilou instável o dia todo** — flipou para negativo (16:34, -120,9M, GEX total -2,38B), voltou a flipar para positivo 1h depois (17:34, +131,8M, GEX melhorou para -2,01B). **Veredito: dia de alívio real face a ontem mas sem convicção — o 0DTE a oscilar entre positivo/negativo reflete um mercado ainda a decidir se o beat da NVDA (confirmado no dia seguinte) é suficiente para mudar o regime.**

---

## 19/11 — IPO da ANT (Anthropic)

**Regime:** NQ mean-reverting leve (0,65, subiu). BTC **flipou para neutro/random walk (0,47, Hurst 30d quase zero)** — perdeu toda a direcionalidade do mês.

**NQ:** **GEX flipou para POSITIVO (+410,3M)** — primeira leitura positiva da semana, confirma reação ao beat+raise da NVDA (receita $115,8B vs $109B esp., EPS $2,68 vs $2,47-48 esp., guidance Q4 ~$130B). Preço já ACIMA do zero-gamma (670 QQQ). Antigo Put Wall (680) virou resistência overhead. 0DTE também flipou fortemente positivo (+633,1M). VIX 22,39 (-8,8%, forte compressão), "elevado/cauteloso" mas a normalizar rápido.

**BTC:** spot ~63.834, **flat face a ontem — não acompanhou o rally do NQ** (divergência relevante, baseline pré-IPO). GEX -119,6M. Put Wall desceu de 64.000 para **60.000** (~6% abaixo, bem mais longe). PCR flipou para lean CALL (0,62, vs 1,15-1,58 dos dias anteriores).

**Catalisadores:** **ANT estreia hoje no Nasdaq** — teste direto da tese risk-on/risk-off do utilizador; Fed: fontes dão >90% hike em dezembro, CME FedWatch quase 100% certo de 25bp (~13,6% chance de 50bp).

**O que aconteceu (answer key):** O alívio **não durou nem 1h** — GEX reverteu para negativo às 15:34 (-183,6M), preço cruzou de volta para baixo do zero-gamma. Piorou muito mais às 16:34 (-1,09B, perdeu quase todo o ganho do briefing). Rompeu o Put Support 0DTE (650) às 17:34, GEX -2,73B, pior que o pior momento do dia anterior. **ANT confirmado**: precificou a $83 (acima do range $70-78), $81B levantados (maior IPO de sempre), abriu $111,50 (+34%), rejeitou os highs em 30min (-13% desde a abertura, caiu para ~$97), fechou perto de $101 (+22% vs IPO). **Cenário bearish da tese do utilizador confirmou-se** (expansão inicial + rejeição clara). **BTC não confirmou o risk-off** — esteve a maior parte do dia a subir ou flat enquanto o NQ caía com força, sem contágio claro. **Veredito: dia de reversão violenta no NQ (regime positivo→muito negativo em horas), IPO da ANT seguiu o cenário bear da tese, mas BTC permaneceu desligado — "no correlation assumed" ficou bem fundamentado.**

---

## 20/11

**Regime:** NQ mean-reverting leve (0,65, SEM dados frescos — Cboe bloqueada, 403 Cloudflare, primeiro dia do bloqueio). BTC neutro/random walk (0,45), Hurst 30d praticamente zero.

**NQ:** ⚠️ **Sem dados frescos** — `nq_gex.py` falhou 2x com 403 da Cboe. Última referência conhecida (fecho 19/11, NÃO tratar como de hoje): GEX -3,2B, Put Wall 640 QQQ/~26.413 NQ, Call Wall 685 QQQ/~28.271 NQ, zero-gamma 666,7 QQQ/~27.513 NQ.

**BTC:** spot ~61.951 (dados normais, sem bloqueio). GEX -104,4M. **Put Wall desceu para 60.000, só ~1,6% abaixo do spot** — mais perto que em qualquer dia da semana. PCR 1,64 — lean put mais forte da semana. VIX **29,68 (+4,4%), +38,8% vs média 20d** — valor mais alto da semana, perto de território de stress.

**Catalisadores:** Fed: odds de hike a amolecer (~70-78%, eram >90% há 2 dias) — "bad news is bad news" (medo de crescimento, não alívio de inflação); **midterms**: Democratas varreram a eleição, receio de maior escrutínio regulatório a IA/data centers — catalisador novo.

**O que aconteceu (answer key):** **BTC caiu com força e testou diretamente o Put Wall** — às 15:34 só ~171 USD acima (60.171), CVD fortemente vendedor (delta -6,70). Às 16:34 **rompeu de forma clara o Put Wall (60.000)**, caiu para ~59.135,60 (-1,7%), CVD vendedor mas a abrandar (delta -1,97). **Veredito: dia de tech rout mais amplo (midterms + Fed + digestão ANT todos a convergir), BTC confirmou a fragilidade ao romper o Put Wall pela primeira vez na série — sem NQ fresco para confirmar do outro lado, mas o pano de fundo macro só piorou.**

---

## 23/11 (segunda-feira)

**Regime:** NQ mean-reverting **forte** (0,62, VR confirma pela 1ª vez "forte" em vez de "leve") — SEM dados frescos (Cboe bloqueada, 4º dia, agora confirmado como bloqueio Cloudflare persistente, não transitório). BTC neutro/random walk (0,48).

**NQ:** ⚠️ Sem dados — bloqueio confirmado como Cloudflare (testado via curl direto, não contorna-se).

**BTC:** spot ~63.731-64.790. GEX -51,1M, bem mais fraco que a semana passada (-100 a -140M) — regime a acalmar. Put Wall mantém-se 60.000, ~7,4% abaixo (folga maior que a semana passada). PCR **1,80** — lean put mais forte registado até agora na série. VIX 26,86 (-25,2% no dia — forte compressão vs sexta), ainda "elevado/cauteloso" mas a normalizar do pico de 29,68.

**Catalisadores:** Fed chair confirmado Kevin Warsh; odds ~87,5% hike 8-9/12 (Polymarket, sincronizado 16/11); semana de Ação de Graças, mercados fechados quinta 26/11.

**O que aconteceu (answer key):** Sem alertas horários registados neste dia além do briefing. **Veredito: dia de estabilização relativa — VIX a comprimir fortemente, BTC com mais folga do Put Wall, sem NQ para confirmar. Primeira sessão "tranquila" desde a fase aguda de 19-20/11.**

---

## 24/11

**Regime:** NQ mean-reverting forte (0,63) — **dados frescos de volta pela primeira vez em 5 sessões** (fallback `yfinance` implementado após o utilizador pedir para resolver o bloqueio, sem contornar a Cloudflare). BTC neutro/random walk (0,48).

**NQ:** GEX **-2,09B a -2,36B ao longo do dia** (ver abaixo), regime de alta vol confirmado do lado do NQ pela primeira vez desde 19/11 — o BTC já tinha sinalizado isto sozinho nos últimos dias. Put Wall começou em 635 QQQ (~26.174 NQ), subiu para 640 QQQ (~26.332 NQ) no fecho.

**BTC:** GEX -91,3M (quase o dobro de ontem). Put Wall desceu de 60.000 para **58.000**, ~3,5% abaixo do spot — mais perto que em qualquer dia desde a rotura de 20/11. VIX **29,12 (+9,4%)**, voltou a subir perto do pico de 21/11. Net premium flow inverteu para puts (-103,6M).

**Catalisadores:** Fed: odds dispersas 71-88% consoante a fonte; COT ainda inutilizável.

**O que aconteceu (answer key):** **BTC aproximou-se consistentemente do Put Wall a cada check** (4,1%→3,6%→2,6% às 14:34/15:34/16:34), CVD vendedor a intensificar-se (delta -11,21 no pico). Depois **afastou-se e CVD virou comprador** (17:34, +1,27) — nível aguentou, sem rutura. **NQ**: preço chegou a ~17pts do Put Wall (que subiu de 635 para 640 no mesmo check, 18:34) — GEX voltou a piorar para -2,36B. **Veredito: dia de confirmação cruzada — o regime mais cauteloso já sinalizado via BTC nos últimos dias confirmou-se agora também no NQ (primeiros dados frescos), com ambos os Put Walls testados de perto mas sem rutura confirmada no fecho.**

---

## 25/11 — dia de maior stress da série

**Regime:** NQ mean-reverting forte (dados via fallback yfinance). BTC neutro/random walk.

**NQ:** **Queda sensível overnight** — caiu ~881pts (~3,3%) desde o fecho de ontem. GEX -2,20B (depois -2,87B no pior momento da tarde). Put Wall começou em 610 QQQ (~25.300 NQ), desceu para 605 QQQ, depois **subiu progressivamente para 630 QQQ** ao longo da tarde (ver abaixo). VIX **31,72 (+20,3%), +36,2% vs média 20d — "stress/pânico"**, pior leitura da série (3º dia seguido a subir: 26,86→29,12→31,72).

**BTC:** spot caiu para ~57.912-58.799, **a roçar ou já ligeiramente abaixo do Put Wall (58.000)** — pela primeira vez o nível não está claramente acima do preço.

**Catalisadores:** Fed: odds de hike subiram para 95,7-100% segundo algumas fontes (tom hawkish reforçado); mercados de ações fecham amanhã (Ação de Graças).

**O que aconteceu (answer key, dia com 3 alertas estruturais + Passo 5 BTC):**
- 15:34 — preço a ~110pts do Put Wall (610), ainda sem alerta; **BTC testou diretamente o Put Wall** (~58.150,70, só 0,26% acima), CVD comprador (delta +2,27) — absorção, não rutura.
- 16:34 — preço a só **~12pts** da zona 610 QQQ (2ª maior parede, o "Put Wall oficial" tinha descido para 605); **BTC saltou do Put Wall** (+0,94%), CVD ainda mais comprador (+3,61) — nível confirmado a aguentar.
- 17:34 — **bounce forte**: NQ subiu +366pts, atravessou todo o cluster 605-610 QQQ, Put Wall acompanhou subindo para 620 (preço só ~42pts acima).
- 18:34 — bounce continua, +339pts mais, Put Wall sobe para 630, GEX estável (-2,21B).

**Veredito: o dia de maior stress da série (VIX em pânico, NQ e BTC ambos a testar os seus Put Walls quase ao mesmo tempo) resolveu-se em ABSORÇÃO e BOUNCE, não em rutura — ambos os níveis aguentaram como suporte, e a tarde foi de recuperação consistente (~705pts de bounce no NQ desde o mínimo).**

---

## 26/11 — Ação de Graças (mercado de ações fechado)

Sem sessão NQ (confirmado: sem expiração 0DTE na cadeia QQQ). Níveis listados são o fecho de 25/11 residual, não dados de hoje. **BTC** (negoceia sempre): GEX -70,8M (mais fraco, regime a acalmar), Put Wall mantém-se 58.000 agora ~4,7% abaixo (folga confortável pós-teste de ontem). VIX 27,12 (-4,1%), a continuar a normalizar do pico de pânico. Net premium flow: maior desvio da série a favor de puts (-2,51B), mas proxy de OI, não fluxo real. **Sem alertas horários relevantes.** Amanhã (27/11, Black Friday) sessão encurtada, fecho 13h ET.

---

## 27/11 — Black Friday (sessão encurtada, fecho 13h ET)

**Regime:** NQ mean-reverting forte (0,63). BTC neutro/random walk (0,58).

**NQ:** sessão confirmada aberta (149 contratos 0DTE no briefing). GEX -1,96B. **Put Wall saltou para 640 QQQ (~26.609 NQ) — preço praticamente em cima dele** (~0,03% de diferença, maior concentração de GEX da série). Call Wall 680 QQQ. Max pain coincide com o Put Wall (640). PCR caiu para 0,64 — lean claro para calls.

**BTC:** spot ~61.214,79. GEX -42,5M, regime a continuar a acalmar. Put Wall 58.000, ~5,3% abaixo — folga confortável.

**Catalisadores:** Fed sem atualização (Polymarket 16/11: 87,5% hike); próximo dado-chave: relatório de emprego 4/12, depois FOMC 8-9/12; JOLTS 1/12 é o catalisador da próxima semana. VIX 25,72 (-4,0%), **3º dia seguido a cair** desde o pico de pânico de 25/11 (31,72→27,12→25,72).

**O que aconteceu (answer key, dia muito ativo, 4 alertas estruturais + Passo 5 BTC):**
- 15:34 — **pullback de ~200pts** (26.616→26.416), GEX 0DTE **reverteu para positivo** (+700M, era -641M no briefing) — dealers passaram de put-heavy a call-heavy; cluster 640-641 virou pin/resistência.
- 16:34 — preço recuperou (+137pts) e ficou a só **~13,5pts do Call Wall** (647 QQQ); **BTC**: subiu mas CVD extremamente vendedor (delta -22,91, o mais extremo da série) — divergência preço/orderflow notável, sem resolução ainda.
- 17:34 — preço ficou **praticamente pinado no Call Wall** (só ~1,75pts de diferença) — comportamento clássico de pin de fecho em sessão de baixo volume; **BTC**: a divergência de CVD do check anterior **resolveu-se para o lado da venda** (caiu -1,1%, CVD voltou a neutro).
- 18:34 — **fecho da sessão** (13h ET). Preço subiu mais (+132pts) e fechou a ~15pts do novo Put Wall (650 QQQ). GEX 0DTE reverteu de volta para negativo (-940M) no settlement final.

**Veredito: dia de bounce consolidando-se — 3 sessões seguidas de VIX a cair, GEX do NQ a oscilar mas sempre em torno de níveis cada vez mais próximos do preço (comportamento de pin, não de tendência), fecho de semana em alta clara desde o mínimo de 25/11. BTC mostrou uma divergência de orderflow notável (CVD extremo vendedor sem o preço ceder de imediato) que acabou por se resolver a favor da venda 1h depois — lição de leitura: CVD extremo nem sempre precede imediatamente o movimento de preço.**

---

## Resumo de uma linha por dia

| Data | Headline |
|------|----------|
| 09/11 | Melhor sessão da semana — rompeu 665/zero-gamma, pin forte em 677-678 no fecho |
| 10/11 | Chop puro — 4 reversões de Call/Put Wall na mesma tarde, sem lado dominante |
| 11/11 | Zero-gamma como pivot resolveu-se para cima — regime positivo a reforçar-se |
| 12/11 | Réplica do caos de 10/11 — GEX oscilou positivo↔negativo 4x no mesmo dia |
| 13/11 | Manhã calma, quebra estrutural clara na tarde — cenário bearish do briefing cumpriu-se |
| 16/11 | Compressão pré-NVDA — walls a convergir/divergir sem resolução |
| 17/11 | Bearish e em deterioração constante — pior fecho da semana, véspera do NVDA |
| 18/11 | Alívio real mas sem convicção — 0DTE a oscilar positivo/negativo o dia todo |
| 19/11 | Reversão violenta pós-NVDA; IPO da ANT confirmou o cenário bear da tese; BTC desligado |
| 20/11 | Tech rout mais amplo (midterms+Fed) — BTC rompeu o Put Wall pela 1ª vez na série |
| 23/11 | Estabilização relativa — VIX a comprimir, primeira sessão tranquila desde 19-20/11 |
| 24/11 | Confirmação cruzada — NQ (dados de volta) e BTC ambos testam os seus Put Walls de perto |
| 25/11 | Dia de maior stress da série (VIX em pânico) — resolveu-se em absorção e bounce, não rutura |
| 26/11 | Ação de Graças — mercado de ações fechado, só BTC (a continuar a acalmar) |
| 27/11 | Bounce a consolidar-se — pin no Call Wall, divergência de CVD no BTC resolvida a favor da venda |
