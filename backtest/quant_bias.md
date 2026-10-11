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
- **Camada quant (eu trago, via `backtest/quant/regime.py`, dados reais):** classificação de regime
  trending vs mean-reverting para NQ (proxy QQQ) e BTC (Kraken), via Hurst exponent (R/S) + Variance
  Ratio test, em janelas de 1 ano / 90 dias / 30 dias. Acesso à rede de dados desbloqueado em 11/10
  (ambiente mudado para "Full"). Esta camada usa dados reais, não pesquisa — maior confiança que a
  camada macro. Ver metodologia completa nos comentários do script.
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
| 11/10 | — | — | — | — | Camada quant (dados reais) | **Camada de regime (Hurst/VR) adicionada e testada no mesmo dia** — rede desbloqueada, `backtest/quant/regime.py` já a correr com dados reais (QQQ/Kraken). Resultado: **NQ 90d → mean-reverting forte (VR lag8 0,52)**, bate certo com a leitura já feita esta semana ("super chopped"). **BTC 90d → trending forte (VR lag8 1,36)**, favorece continuação sobre reversão. Janelas de 30d pouco fiáveis (amostra pequena). A partir de amanhã entra na rotina diária automática. |

## Fontes a privilegiar nas próximas pesquisas
- COT: CFTC.gov diretamente, ou tradingster.com/cot (dados mais limpos que os encontrados hoje)
- Fed: federalreserve.gov (press releases) em vez de agregadores
- BTC: coinglass.com (funding/OI), sosovalue.xyz (fluxos ETF) — mencionados por fontes como "ir diretamente"
