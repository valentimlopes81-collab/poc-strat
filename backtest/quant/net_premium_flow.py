"""Proxy de "net premium flow" para NQ via opcoes QQQ.

AVISO HONESTO: isto NAO e net premium flow real (que precisa de dados de
trade-flow classificados por agressor -- comprador vs vendedor -- tipicamente
pagos, tipo Unusual Whales/FlowAlgo). O que a Yahoo da e so open interest e
ultimo preco por contrato, sem saber se a OI cresceu por compra ou venda de
opcoes.

Proxy usado aqui: variacao diaria de Open Interest x premio da opcao,
agregada por calls/puts -- mede "onde cresceu posicionamento (em OI) desde
ontem", nao o fluxo real de ordens. Uma call OI a crescer pode ser compra de
calls (bullish) OU venda de calls cobertas (menos bullish) -- esta
ambiguidade e uma limitacao estrutural dos dados gratuitos, nao resolvida
por este script. Tratar como contexto a acumular, nunca como sinal de
entrada sozinho -- mesmo espirito do resto da camada quant.

Guarda um snapshot diario em premium_flow_history.json (ao lado deste
script) e compara com o snapshot do dia anterior disponivel.

Uso: python3 backtest/quant/net_premium_flow.py
"""
import datetime
import json
import os
import subprocess
import sys
import tempfile
import time

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MULTIPLIER = 100.0
RETRY_DELAYS = [5, 15, 30]
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "premium_flow_history.json")
MAX_DAYS = 21  # mesmo horizonte do nq_gex.py, para consistencia
KEEP_DAYS = 10  # nao deixar o historico crescer sem limite


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def get_crumb_and_cookies(cookiejar):
    sh(["curl", "-s", "-c", cookiejar, "-A", UA, "https://fc.yahoo.com", "-o", "/dev/null", "--max-time", "15"])
    last_crumb = ""
    for attempt, delay in enumerate([0] + RETRY_DELAYS):
        if delay:
            print(f"AVISO: Yahoo rate-limit no crumb, a tentar outra vez em {delay}s "
                  f"(tentativa {attempt+1}/{len(RETRY_DELAYS)+1})...", file=sys.stderr)
            time.sleep(delay)
        crumb = sh(["curl", "-s", "-b", cookiejar, "-c", cookiejar, "-A", UA,
                    "https://query2.finance.yahoo.com/v1/test/getcrumb", "--max-time", "15"]).strip()
        if "Too Many Requests" not in crumb and crumb:
            return crumb
        last_crumb = crumb
    raise RuntimeError(f"Yahoo continua em rate-limit apos {len(RETRY_DELAYS)+1} tentativas: {last_crumb[:100]}")


def fetch_chain(symbol, cookiejar, crumb, date=None):
    url = f"https://query1.finance.yahoo.com/v7/finance/options/{symbol}?crumb={crumb}"
    if date:
        url += f"&date={date}"
    raw = sh(["curl", "-s", "-b", cookiejar, "-A", UA, url, "--max-time", "20"])
    return json.loads(raw)


def build_snapshot(cookiejar, crumb, max_days=MAX_DAYS):
    now = datetime.datetime.utcnow()
    d0 = fetch_chain("QQQ", cookiejar, crumb)
    result = d0["optionChain"]["result"][0]
    spot = result["quote"]["regularMarketPrice"]
    exp_dates = [e for e in result["expirationDates"] if (datetime.datetime.utcfromtimestamp(e) - now).days <= max_days]

    snap = {}  # "C_<strike>_<exp>" / "P_<strike>_<exp>" -> {oi, premium}
    for i, exp in enumerate(exp_dates):
        d = fetch_chain("QQQ", cookiejar, crumb, date=exp) if i > 0 else d0
        opts = d["optionChain"]["result"][0]["options"][0]
        for c in opts["calls"]:
            snap[f"C_{c['strike']}_{exp}"] = {"oi": c.get("openInterest") or 0, "premium": c.get("lastPrice") or 0}
        for p in opts["puts"]:
            snap[f"P_{p['strike']}_{exp}"] = {"oi": p.get("openInterest") or 0, "premium": p.get("lastPrice") or 0}
    return spot, snap


def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE) as f:
            return json.load(f)
    return {}


def save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f)


def main():
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tf:
        cookiejar = tf.name
    crumb = get_crumb_and_cookies(cookiejar)
    spot, snap = build_snapshot(cookiejar, crumb)

    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    history = load_history()

    print(f"QQQ price: {spot}")
    print(f"Data (UTC): {today}")

    prior_dates = sorted(d for d in history if d < today)
    if not prior_dates:
        history[today] = snap
        save_history(history)
        print("\nSem snapshot anterior -- primeiro dia a gravar. Sem comparação ainda "
              "(volta amanhã para a 1ª leitura real).")
        return

    prior_date = prior_dates[-1]
    prior_snap = history[prior_date]

    call_flow = 0.0
    put_flow = 0.0
    for key, cur in snap.items():
        prior = prior_snap.get(key, {"oi": 0, "premium": cur["premium"]})
        d_oi = cur["oi"] - prior["oi"]
        notional = d_oi * cur["premium"] * MULTIPLIER
        if key.startswith("C_"):
            call_flow += notional
        else:
            put_flow += notional

    net = call_flow - put_flow
    print(f"\nComparando com snapshot de {prior_date}:")
    print(f"  Δ OI × prémio (calls): {call_flow:+,.0f}")
    print(f"  Δ OI × prémio (puts):  {put_flow:+,.0f}")
    print(f"  Net (calls - puts):    {net:+,.0f}  ({'mais calls' if net > 0 else 'mais puts'} em OI novo)")
    print("\n⚠️  AVISO: proxy de crescimento de Open Interest, NÃO fluxo de ordens real")
    print("    (não sabemos se foi compra ou venda de opções). Ver docstring do script.")

    history[today] = snap
    for d in sorted(history)[:-KEEP_DAYS]:
        del history[d]
    save_history(history)


if __name__ == "__main__":
    main()
