"""IV term structure + skew para NQ (via QQQ) -- a "vol surface" que faltava
ao terminal: estrutura a prazo (IV ATM por expiracao, sinaliza risco de
evento como CPI/FOMC) e skew (IV por strike, sinaliza procura de hedge).
Reusa a mesma chain que nq_gex.py/gex_heatmap.py ja buscam -- zero custo de
API adicional alem do fetch desta propria chain.

Uso: python3 backtest/quant/iv_surface.py
Escreve terminal/public/data/iv_term_nq.json e iv_skew_nq.json.
"""
import datetime
import json

from openbb_data import fetch_qqq_chain_df

OUT_DIR = "terminal/public/data"


def export_term_structure(df, spot, max_expiries=25):
    today = datetime.datetime.utcnow().date()
    rows = []
    exps = sorted(e for e in df["expiration"].unique() if (e - today).days >= 0)[:max_expiries]
    for exp in exps:
        sub = df[df["expiration"] == exp].copy()
        sub["dist"] = (sub["strike"] - spot).abs()
        atm_strike = sub.loc[sub["dist"].idxmin(), "strike"]
        ivs = sub.loc[sub["strike"] == atm_strike, "implied_volatility"].dropna()
        if ivs.empty:
            continue
        dte = (exp - today).days
        rows.append({"expiry": exp.isoformat(), "dte": dte, "atm_iv": round(float(ivs.mean()) * 100, 2)})
    with open(f"{OUT_DIR}/iv_term_nq.json", "w") as f:
        json.dump({"spot": spot, "rows": rows}, f, indent=2)
    print(f"IV term structure NQ: {len(rows)} expiracoes")


def export_skew(df, spot, pct_band=0.1):
    today = datetime.datetime.utcnow().date()
    exps = sorted(e for e in df["expiration"].unique() if (e - today).days > 0)
    if not exps:
        print("Sem expiracoes futuras, a saltar skew.")
        return
    exp = exps[0]
    sub = df[df["expiration"] == exp]
    lo, hi = spot * (1 - pct_band), spot * (1 + pct_band)
    sub = sub[(sub["strike"] >= lo) & (sub["strike"] <= hi)]
    rows = []
    for r in sub.itertuples():
        iv = r.implied_volatility
        if not iv or iv <= 0:
            continue
        rows.append({
            "strike": float(r.strike),
            "moneyness_pct": round((r.strike / spot - 1) * 100, 2),
            "iv": round(float(iv) * 100, 2),
            "cp": "C" if r.option_type == "call" else "P",
        })
    rows.sort(key=lambda r: r["strike"])
    with open(f"{OUT_DIR}/iv_skew_nq.json", "w") as f:
        json.dump({"spot": spot, "expiry": exp.isoformat(), "rows": rows}, f, indent=2)
    print(f"IV skew NQ: {len(rows)} contratos, expiracao {exp.isoformat()}")


def main():
    df, spot = fetch_qqq_chain_df()
    export_term_structure(df, spot)
    export_skew(df, spot)


if __name__ == "__main__":
    main()
