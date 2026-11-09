# 📊 Scorecard da Bias — qualidade do registo diário

*Objetivo: medir, não só registar. Cada dia o `quant_bias.md` dá uma bias (NQ e BTC) com um nível de
confiança declarado. Este ficheiro revê, no dia seguinte (ou quando o desfecho já é claro), se a bias
se confirmou, falhou, ou ficou parcial — e porquê. Processo pedido pelo utilizador a 09/11, para
perceber a qualidade real da bias ao longo do tempo, não só no momento em que é dada.*

**Como ler:** ✅ Confirmado · ⚠️ Parcial (direção certa, detalhe/timing errado, ou inverteu depois) ·
❌ Falhou (contradito pelos factos, sobretudo grave se a confiança declarada era Alta).

**Processo a partir de agora:** no início de cada briefing diário novo, reviso a bias do dia anterior
primeiro (com os dados que entretanto ficaram registados nos checks horários e no que o utilizador
reportou), e só depois dou a bias de hoje.

---

## Semana de 02-09/11 (retroativo, construído a pedido do utilizador)

### 02/11
- **NQ:** "Neutro/em recuperação, risco real ainda à frente" (Média) → **✅ Confirmado.** Rejeição ao
  vivo nos 699,50 no próprio dia, consistente com a leitura. O "risco real ainda à frente" também se
  confirmou — não no mecanismo exato previsto (não anteviu a cascata do BTC), mas a instrução de
  "não tratar isto como tempestade passada" foi validada pela semana que se seguiu.
- **BTC:** "Pin leve, choque do hack a esbater-se" (Média) → **✅ Confirmado** no curto prazo — GEX
  continuou a melhorar nos 3 dias seguintes antes de reverter a 05/11.

### 03/11
- **NQ:** "Negativo a aprofundar, dia de risco real (eleições)" (Média) → **⚠️ Parcial.** Correto sobre
  a fragilidade pré-resultado (preço caiu de manhã, perdeu o 690). Mas o próprio briefing dizia
  explicitamente "resultado desconhecido" — não podia prever a reversão forte que se seguiu quando
  saiu a vitória Democrata. Não é erro, é o limite correto do que dava para saber à hora.
- **BTC:** "Estabilização a continuar" (Média-Alta) → **✅ Confirmado** — GEX melhorou esse dia
  (+57,1M).

### 04/11
- **NQ:** "Cauteloso, divergência GEX vs VIX" (Baixa-Média), com hipótese explícita de que seria
  "alívio pós-eleições ainda não refletido na estrutura de gamma" → **✅ Confirmado**, e bem — horas
  depois confirmou-se o rally de alívio pós-eleições (Democratas), GEX melhorou ao longo do dia. A
  confiança baixa declarada foi apropriada à incerteza real do momento, não um erro de calibração.
- **BTC:** "Estabilização a reforçar-se" (Média-Alta) → **✅ Confirmado** — GEX +113,5M, melhor
  leitura da semana até então.

### 05/11
- **NQ:** "Negativo a aprofundar, sem catalisador confirmado" (Média) → **✅ Confirmado**, e piorou
  ainda mais ao longo do dia do que o briefing inicial sugeria (GEX chegou a -6,11B, pior da semana,
  preço perdeu vários níveis em sequência).
- **BTC:** "Estabilização forte a continuar, GEX positivo robusto" (**Alta**) → **❌ Falhou — o pior
  erro da semana**, e justamente no dia de maior confiança declarada. Horas depois do briefing
  (14h-15h UTC) aconteceu a cascata de liquidações (-5,9%, maior volume de puts da história da CBOE),
  GEX virou negativo. **Lição a reter:** GEX "robusto e positivo" mediu bem o posicionamento de
  opções até àquele momento, mas não via (nem podia ver) o risco de alavancagem/liquidações fora do
  mercado de opções — a complacência da leitura de opções não protegeu contra um choque de liquidez.
  Vale a pena, em dias de "estabilização forte" com confiança Alta, lembrar este caso antes de
  repetir o mesmo grau de confiança.

### 06/11
- **NQ:** "Recuperação parcial pós-bloodbath" (Média) → **✅ Confirmado** — GEX continuou a melhorar
  nos dias seguintes (-2,48B → -1,37B → -1,01B até 09/11).
- **BTC:** "GEX negativo, ainda frágil" (Média) → **✅ Confirmado** — continuou negativo (ainda que
  leve) até 09/11, sem reversão rápida.

### 09/11
- Pendente — dia em curso, revisão no próximo briefing.

---

## Resumo da semana (6 dias, 12 bias no total: NQ+BTC)

- **✅ Confirmado:** 9
- **⚠️ Parcial:** 1 (NQ 03/11 — limite correto da informação disponível, não erro)
- **❌ Falhou:** 1 (BTC 05/11 — o caso a reter)
- **Pendente:** 1 (09/11, por resolver)

**Leitura honesta:** a bias do NQ teve uma semana sólida — mesmo nos dias errados na direção
superficial (03/11), o raciocínio declarado estava correto dado o que era conhecido no momento. O
ponto fraco real foi o BTC a 05/11: confiança Alta associada a "estabilização forte" que não resistiu
a um choque de liquidez fora do radar do GEX. Padrão a vigiar: GEX positivo/robusto não é garantia
contra eventos de alavancagem — talvez valha a pena nunca dar confiança "Alta" a uma leitura de
BTC baseada só em GEX, dado que já se provou insuficiente uma vez.
