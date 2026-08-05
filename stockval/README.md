# StockVal — Valor Intrínseco de Ações (EUA)

Calcula o **valor intrínseco** de ações americanas por **DCF a 2 fases** + rácios
fundamentais, usando dados **oficiais e gratuitos da SEC EDGAR** e o preço via
Stooq. Pensado para dar uma base rápida que complementas com análise técnica.

## Modelo
- **DCF (2 fases):** `V0 = Σ FCF_t/(1+WACC)^t + FCF_n(1+g)/((WACC−g)(1+WACC)^n)`
- **WACC:** `E/(E+D)·re + D/(E+D)·rd·(1−T)` · **CAPM:** `re = rf + β(rm−rf)`
- **FCF = CFO − CAPEX** · valor da empresa → menos dívida líquida → por ação
- **Rácios:** P/E, P/B, PEG, ROE, D/E

Pressupostos com **defaults sensatos** (editáveis no site): 10 anos, crescimento
8% (ou CAGR histórico do FCF, limitado a 15%), terminal 2.5%, rf 4%, β 1.0,
prémio 5%, imposto 21%, margem de segurança 30%.

## Testar rápido (precisa de internet)
```bash
cd stockval
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python cli.py AAPL      # mostra fundamentais + valor intrínseco
```

## Correr o site
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```
Abre `http://localhost:8001`, escreve um ticker (AAPL, MSFT, KO…), ajusta os
pressupostos e vê o valor intrínseco vs preço + margem de segurança.

## Testes (sem rede)
```bash
PYTHONPATH=. pytest tests -q
```

## Deploy no mesmo servidor (opcional)
Corre noutra porta (ex.: 8001) como serviço systemd, à semelhança do poc-strat,
e serve por um subdomínio/rota no nginx. Pede-me quando quiseres montar isto.

## Notas honestas
- **Só EUA** (SEC EDGAR). Fora dos EUA precisaria de outra fonte (paga).
- Os tags XBRL variam entre empresas — se algum valor vier em falta para um
  ticker, o CLI mostra o que faltou e ajustamos os tags.
- O valor intrínseco depende **muito** dos pressupostos — é uma base, não um oráculo.
