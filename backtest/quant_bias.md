# 🔬 Quant Bias Briefing — NQ & BTC

*Objetivo: uma camada de bias macro/institucional acima do trabalho técnico (POC/VAL). O gráfico
continua a dar o timing e o POI; isto dá o "porquê" de fundo — regime de taxas, posicionamento,
fluxos — para que o edge esteja cada vez mais suportado em razões institucionais, não só em leitura
de preço. Inspirado em parte pela abordagem de sistemas inteligentes/adaptativos de "Quantum Finance,
Intelligent Forecast and Trading Systems" (Raymond Lee) — não computação quântica literal, mas a ideia
de combinar várias fontes de informação (regime, posicionamento, sentimento) num veredicto classificado
por confiança, em vez de um número único.*

## Metodologia

**Limitação honesta descoberta no arranque (11/10):** pesquisa web não é fiável para dados "ao minuto"
(taxa Fed exata, DXY, VIX, preço BTC agora mesmo) — traz números desencontrados e por vezes desatualizados
mesmo pedindo "hoje". Por isso o desenho é híbrido:

- **Camada lenta (eu trago, via pesquisa):** posicionamento COT (Nasdaq futures, atualiza sexta-feira
  com dados de terça), postura da Fed/trajetória de taxas (só muda em FOMC), calendário macro da semana
  (CPI, NFP, FOMC), regime histórico de correlação BTC-Nasdaq-DXY, fluxos de ETF BTC (tendência, não
  valor exato do dia).
- **Camada quant (eu trago, via `backtest/quant/*.py`, dados reais):** acesso à rede desbloqueado em
  11/10 (ambiente mudado para "Full"). Scripts, todos sem dependências externas:
  - `regime.py` — regime trending vs mean-reverting (NQ proxy QQQ, BTC Kraken) via Hurst exponent (R/S)
    + Variance Ratio, janelas 1y/90d/30d.
  - `btc_options_levels.py` / `nq_options_levels.py` — max pain, put/call OI ratio, paredes de open
    interest por strike (Deribit nativo para BTC — alta confiança; QQQ/Yahoo proxy para NQ — menor
    confiança estrutural, traduzido para equivalente NQ via rácio de preço).
  - `gex_common.py` + `btc_gex.py` / `nq_gex.py` — GEX (gamma exposure) aproximado via Black-Scholes
    gamma × OI por strike (metodologia pública standard, não proprietária). Dá o **ponto de zero-gamma**
    (fronteira entre regime de pin/baixa vol e regime volátil) — o nível mais acionável desta camada,
    sobretudo quando perto do preço atual.
  - Esta camada usa dados reais, não pesquisa — maior confiança que a camada macro abaixo. Dá níveis
    concretos (não só bias direcional) para cruzar com as confluências técnicas de POC/VAL.
- **Camada rápida (tu trazes, do teu terminal):** preço atual NQ e BTC, range overnight, qualquer
  contexto de sessão que já estejas a ver. Sem isto, o bias fica mais genérico/estrutural.
- **Output:** Bias (Bullish/Bearish/Neutral) + Confiança (Baixa/Média/Alta) + catalisadores/riscos a
  vigiar — nunca um sinal de entrada, sempre uma camada de contexto para o teu POI técnico confirmar.
- **Tracking:** cada bias fica registado e comparado depois com o que o mercado fez de facto — mesmo
  espírito anti-hindsight do journal MNQ. Se esta camada não tiver edge real ao longo do tempo, o
  histórico vai mostrar isso com honestidade.

## Registo diário

| Data | NQ Bias | Confiança | BTC Bias | Confiança | Catalisadores/Riscos | Notas |
|------|---------|-----------|----------|-----------|----------------------|-------|
| 11/10 | — | — | — | — | — | **Dry run / arranque (parte macro).** Pesquisa expôs o problema de dados desatualizados (ver Metodologia). Dado estrutural recolhido: COT Nasdaq-100 (18/08) — leveraged funds **net short ~62K contratos (-20,73% do OI)**, perto do extremo de curto de 3 anos, mas já com rotação de +27K para long face ao relatório anterior — não é "hoje" mas é o tipo de dado que se move devagar e continua relevante. Fed funds range impreciso nas fontes (entre 3,50-3,75% e possível hike em setembro não confirmado) — a confirmar na próxima briefing real. Sem BTC: dados de preço/dominância/correlação todos desatualizados (anos, não dias) — inútil para bias de hoje. **Primeira briefing "a sério" fica para 2ª feira**, com os teus números de terminal a ancorar. |
| 11/10 | — | — | — | — | Camada quant (dados reais) | **Camada de regime (Hurst/VR) adicionada e testada no mesmo dia** — rede desbloqueada, `backtest/quant/regime.py` já a correr com dados reais (QQQ/Kraken). Resultado: **NQ 90d → mean-reverting forte (VR lag8 0,52)**, bate certo com a leitura já feita esta semana ("super chopped"). **BTC 90d → trending forte (VR lag8 1,36)**, favorece continuação sobre reversão. Janelas de 30d pouco fiáveis (amostra pequena). |
| 11/10 | — | — | — | — | Camada de níveis + GEX (dados reais) | **Mesmo dia, expansão a pedido do utilizador:** adicionados níveis de liquidez (max pain, paredes de OI) e GEX aproximado (zero-gamma) para NQ e BTC. **BTC (spot ~83.660):** GEX positivo (regime de pin), zero-gamma em **~81.330** (abaixo do spot), paredes fortes em 90k/95k (resistência/pin) e 80k/78k (suporte/acelerador). Max pain expiração 12/10: 82.000, put/call ratio 0,42 (mais calls, bullish curto prazo). **NQ (via proxy QQQ, preço ~31.109):** GEX positivo, zero-gamma muito próximo do preço em **~31.060** — mercado perto da fronteira de regime. Parede mais forte ~31.470 (resistência/pin). Put/call ratio 2,27 (mais puts, mas normal em índices por hedging institucional, não necessariamente bearish). Tudo isto passa a correr na rotina diária automática a partir de amanhã. |
| 12/10 | Neutro/cauteloso | Média | Bullish de fundo, cautela curto prazo | Média | Dia de bank holiday (Columbus Day, EUA) — bolsa aberta mas volume tipicamente mais fino; rotina das 10h UTC falhou (não disparou), briefing feito manualmente | **Bug corrigido:** `nq_gex.py` dava níveis absurdos antes da abertura das opções (13:30 UTC) por IV quase-zero em contratos sem cotação ainda — agora filtra IV<1% e avisa se há poucos contratos válidos. **Rotina movida de 10:00 para 14:00 UTC** (depois da abertura, dados fiáveis). **NQ (via proxy QQQ, preço ~30.987):** **Zero-gamma: 30.990** (preço mesmo em cima, testado e validado ao vivo). **Call Wall: 31.227-31.267** (zona, strike 755 QQQ, GEX dominante). **Put Wall: 30.606-30.646** (740 QQQ). Secundárias: 31.434-31.515 (cluster 760/761) e 32.055-32.095 (775). Zona de resistência 31.255-31.280 (de ontem) foi testada na sessão Ásia (tocou Asia H 31.289) e rejeitou, preço caiu até à zero-gamma onde reagiu com RSI em sobrevenda. **BTC:** GEX enfraqueceu de 124M (ontem) para ~75M — regime de pin mais frágil. Put/call ratio da expiração mais próxima **inverteu de 0,42 para 1,65** (mudança real, mais defensivo). Call Wall 90.000, Put Wall 80.000, zero-gamma ~81.500 mantêm-se estáveis. **Nova rotina criada:** alerta horário (13h-17h UTC) se o preço NQ estiver a <30 pontos de alguma destas zonas durante a killzone. |
| 13/10 | — | — | — | — | Validação ao vivo da zona Put Wall | **✅ VALIDAÇÃO REAL:** preço rompeu a zero-gamma (30.990) durante a noite/sessão Ásia e caiu com força direta até ao **Put Wall (30.606-30.646)** — a última estrutura GEX conhecida para baixo (tocou Asia L 30.604,75, praticamente dentro da zona). **Segurou como suporte, reação forte com volume real** (~150 pts de recuperação, medição do utilizador: +118,75 pts/+0,39% em 70 barras, vol 8,58K), tal como o framework previa ("se romper a zero-gamma, regime fica mais volátil/direcional até à próxima estrutura"). Primeiro ponto de confirmação concreto no histórico desta camada. **Rotinas corrigidas:** briefing principal e alerta horário movidos para 14:30 Lisboa (13:30 UTC, hora real de abertura das opções — antes estavam 1h cedo demais). Alerta horário passa a tentar recalcular o NQ a cada disparo (com fallback automático se ainda instável) em vez de só comparar contra zonas estáticas; BTC retirado do automatismo (utilizador pede diretamente). |
| 14/10 | Neutro, ponto de decisão | Baixa/Média | Bullish de fundo, GEX a enfraquecer ligeiramente | Média | Nada de novo nos papers lidos hoje (OFI exige order book que não temos; return-distributions é académico, não acionável) | **NQ (preço 30.630 na abertura):** 🔴 **preço literalmente em cima da zero-gamma (30.629)** — ponto mais sensível possível. GEX total fraco (34M, bem abaixo do BTC). Call Wall ~30.774 (zona 30.754-30.794), Put Wall ~30.319 (zona 30.299-30.339). 0DTE: Call Resistance ~30.774, Put Support ~30.484 (mais próximos/imediatos que os multi-expiração). Regime (Hurst/VR) inalterado: NQ mean-reverting forte, BTC trending forte. **BTC (spot ~84.020):** Call Wall 90.000 / Put Wall 80.000 estáveis, zero-gamma 81.697. GEX **reforçou** para 127,7M (tinha caído para ~75M ontem) — regime de pin outra vez mais forte. Put/call ratio normalizou (0,81, era 1,65 ontem) — menos defensivo. Max pain expiração 14/10: 83.000. |

## Fontes a privilegiar nas próximas pesquisas
- COT: CFTC.gov diretamente, ou tradingster.com/cot (dados mais limpos que os encontrados hoje)
- Fed: federalreserve.gov (press releases) em vez de agregadores
- BTC: coinglass.com (funding/OI), sosovalue.xyz (fluxos ETF) — mencionados por fontes como "ir diretamente"
