# StockVal — Valor Intrínseco de Ações (EUA)

Calcula o **valor intrínseco** de ações americanas por **DCF a 2 fases** + rácios
fundamentais, usando dados **oficiais e gratuitos da SEC EDGAR** e o preço via
Stooq. Pensado para dar uma base rápida que complementas com análise técnica.

## Modelo
- **DCF (2 fases):** `V0 = Σ FCF_t/(1+WACC)^t + FCF_n(1+g)/((WACC−g)(1+WACC)^n)`
- **WACC:** `E/(E+D)·re + D/(E+D)·rd·(1−T)` · **CAPM:** `re = rf + β(rm−rf)`
- **FCF = CFO − CAPEX** · valor da empresa → menos dívida líquida → por ação
- **Rácios:** P/E, P/B, PEG, ROE, D/E, P/S, EV/EBITDA, margem líquida
- **Criação de valor & balanço:** ROIC vs WACC, net debt/EBITDA, interest coverage,
  FCF yield, diluição (nº ações/ano) e SBC/receita, margem bruta/operacional +
  tendência, EPS CAGR e operating leverage (informativos — não entram no score)

Pressupostos com **defaults sensatos** (editáveis no site): 10 anos, crescimento
8% (ou CAGR histórico do FCF, limitado a 15%), terminal 2.5%, rf 4%, β 1.0,
prémio 5%, imposto 21%, margem de segurança 30%.

## Correr no meu PC (localhost) — a forma mais simples
Não precisa de servidor nenhum. Só do Python instalado ([python.org](https://www.python.org/downloads/)).

- **Mac/Linux:** na pasta `stockval/`, corre `./run.sh`
  (1ª vez: `chmod +x run.sh`)
- **Windows:** duplo-clique em `run.bat` (dentro de `stockval/`)

O script cria o ambiente e instala tudo **na 1ª vez**, arranca o site e **abre
sozinho** o browser em `http://127.0.0.1:8001`. Deixa a janela aberta enquanto
usas; `Ctrl+C` para parar. Nas vezes seguintes arranca em segundos.

Escreve um ticker (AAPL, MSFT, KO…), ajusta os pressupostos e vê o valor
intrínseco vs preço + margem de segurança. **Precisa de internet** (puxa dados
da SEC + preço).

## Alternativa manual (se preferires)
```bash
cd stockval
python3 -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main        # abre o site em http://127.0.0.1:8001
python cli.py AAPL        # ou só o CLI: fundamentais + valor intrínseco no terminal
```

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
