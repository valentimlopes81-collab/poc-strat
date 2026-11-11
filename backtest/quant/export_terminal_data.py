"""Export consolidado dos dados "mecanicos" (sem julgamento/narrativa) do
terminal, para correr tanto manualmente como via GitHub Action agendada.

O que este script ATUALIZA (puramente numerico, sem opiniao):
  - levels.json: campos numericos de GEX/niveis/VIX (preserva bias/note, que
    sao julgamento e continuam a ser escritos manualmente na rotina diaria)
  - cot.json, fomc.json: dados oficiais (CFTC / Federal Reserve via OpenBB)
  - econ_calendar.json: calendario ForexFactory
  - price_nq.json, price_nq_daily.json, price_btc.json, vix_history.json
  - gex_heatmap_nq.json, gex_heatmap_btc.json

O que este script NAO toca (journal/narrativa, continuam manuais):
  scorecard.json, account.json, trades.json, alerts.json

Uso: python3 backtest/quant/export_terminal_data.py
"""
import datetime
import json
import sys
import time

from openbb import obb

import btc_gex
import econ_calendar
import gex_heatmap
import nq_gex
import price_history
import vix as vix_mod
from gex_common import call_put_walls, find_zero_gamma, strikes_by_abs_gex, total_gex_at_spot

OUT_DIR = "terminal/public/data"
LEVELS_PATH = f"{OUT_DIR}/levels.json"
NQ_MULT = nq_gex.MULTIPLIER


def regime_label(gex_total_b):
    return "Negativo (maior volatilidade)" if gex_total_b < 0 else "Positivo (regime de pin/baixa volatilidade)"


def vix_reading_label(v):
    if v < 15:
        return "Baixo/Complacente"
    if v < 20:
        return "Normal"
    if v < 30:
        return "Elevado/Cauteloso"
    return "Stress/Pânico"


def fetch_vix_snapshot():
    closes = vix_mod.fetch_vix()
    if not closes:
        return None, None, None
    cur = closes[-1]
    prev = closes[-2] if len(closes) >= 2 else None
    chg_pct = ((cur - prev) / prev * 100) if prev else None
    return round(cur, 2), (round(chg_pct, 1) if chg_pct is not None else None), vix_reading_label(cur)


def build_nq_level(now_iso, vix_val, vix_chg_pct, vix_reading):
    rows, zero_dte_rows, qqq_spot = nq_gex.build_rows()
    nq_price = nq_gex.fetch_nq_price()
    ratio = (nq_price / qqq_spot) if nq_price else None

    def to_nq(qqq_level):
        return round(qqq_level * ratio) if ratio else None

    def ref(qqq_level):
        return f"{qqq_level:,.1f} QQQ" + (f" (~{qqq_level * ratio:,.0f} NQ)" if ratio else "")

    gex_now = total_gex_at_spot(rows, qqq_spot, NQ_MULT)
    call_wall, put_wall = call_put_walls(rows, qqq_spot, NQ_MULT)
    flips = find_zero_gamma(rows, qqq_spot, NQ_MULT)
    zero_gamma_qqq = min(flips, key=lambda f: abs(f - qqq_spot)) if flips else None

    dte0_dominant, dte0_dominant_ref = None, "Sem 0DTE a terminar hoje (mercado fechado ou sem expiracao do dia)"
    if zero_dte_rows:
        walls_0dte = strikes_by_abs_gex(zero_dte_rows, qqq_spot, NQ_MULT, top_n=1)
        if walls_0dte:
            dte0_dominant = to_nq(walls_0dte[0][0])
            dte0_dominant_ref = ref(walls_0dte[0][0])

    gex_total_b = round(gex_now / 1e9, 3)
    return {
        "asset": "NQ",
        "as_of_utc": now_iso,
        "price": to_nq(qqq_spot) if ratio else qqq_spot,
        "price_ref": f"QQQ {qqq_spot}",
        "price_qqq": round(qqq_spot, 2),
        "gex_total_b": gex_total_b,
        "gex_regime": regime_label(gex_total_b),
        "call_wall": to_nq(call_wall[0]) if call_wall else None,
        "call_wall_ref": ref(call_wall[0]) if call_wall else None,
        "call_wall_qqq": round(call_wall[0], 1) if call_wall else None,
        "put_wall": to_nq(put_wall[0]) if put_wall else None,
        "put_wall_ref": ref(put_wall[0]) if put_wall else None,
        "put_wall_qqq": round(put_wall[0], 1) if put_wall else None,
        "zero_gamma": to_nq(zero_gamma_qqq) if zero_gamma_qqq else None,
        "zero_gamma_ref": ref(zero_gamma_qqq) if zero_gamma_qqq else None,
        "zero_gamma_qqq": round(zero_gamma_qqq, 1) if zero_gamma_qqq else None,
        "dte0_dominant": dte0_dominant,
        "dte0_dominant_ref": dte0_dominant_ref,
        "vix": vix_val,
        "vix_change_pct": vix_chg_pct,
        "vix_reading": vix_reading,
    }


def build_btc_level(now_iso):
    instruments = btc_gex.fetch()
    rows, spot = btc_gex.build_rows(instruments)
    gex_now = total_gex_at_spot(rows, spot)
    call_wall, put_wall = call_put_walls(rows, spot)
    flips = find_zero_gamma(rows, spot)
    zero_gamma = min(flips, key=lambda f: abs(f - spot)) if flips else None
    gex_total_b = round(gex_now / 1e9, 3)
    return {
        "asset": "BTC",
        "as_of_utc": now_iso,
        "price": round(spot, 2) if spot else spot,
        "price_ref": "Deribit index",
        "gex_total_b": gex_total_b,
        "gex_regime": regime_label(gex_total_b),
        "call_wall": round(call_wall[0]) if call_wall else None,
        "call_wall_ref": None,
        "put_wall": round(put_wall[0]) if put_wall else None,
        "put_wall_ref": None,
        "zero_gamma": round(zero_gamma) if zero_gamma else None,
        "zero_gamma_ref": None,
        "dte0_dominant": None,
        "dte0_dominant_ref": None,
        "vix": None,
        "vix_change_pct": None,
        "vix_reading": None,
    }


def update_levels():
    now_iso = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:00Z")
    try:
        with open(LEVELS_PATH) as f:
            existing = {r["asset"]: r for r in json.load(f)}
    except FileNotFoundError:
        existing = {}

    vix_val, vix_chg_pct, vix_reading = fetch_vix_snapshot()
    nq = build_nq_level(now_iso, vix_val, vix_chg_pct, vix_reading)
    btc = build_btc_level(now_iso)

    for row in (nq, btc):
        prev = existing.get(row["asset"], {})
        row["bias"] = prev.get("bias", "")
        row["note"] = prev.get("note", "")

    with open(LEVELS_PATH, "w") as f:
        json.dump([nq, btc], f, indent=2, ensure_ascii=False)
    print(f"levels.json atualizado (bias/note preservados): NQ gex={nq['gex_total_b']}B, BTC gex={btc['gex_total_b']}B")


def update_cot():
    df = obb.cftc.cot(code="CFTC_209742", report_type="financial", provider="cftc").to_dataframe()
    if df.empty:
        print("Sem dados COT, a saltar.", file=sys.stderr)
        return
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) >= 2 else None
    lf_long, lf_short = latest["leveraged_funds_positions_long"], latest["leveraged_funds_positions_short"]
    lf_net = lf_long - lf_short
    oi = latest["open_interest_all"]
    am_long, am_short = latest["asset_manager_positions_long"], latest["asset_manager_positions_short"]
    lf_net_prev = (prev["leveraged_funds_positions_long"] - prev["leveraged_funds_positions_short"]) if prev is not None else None

    if lf_net > 0:
        reading = "Leveraged funds net LONG — posicionamento especulativo favorece alta"
    elif lf_net < 0:
        reading = "Leveraged funds net SHORT — posicionamento especulativo favorece baixa"
    else:
        reading = "Leveraged funds neutros"

    row = {
        "report_week": str(latest["report_week"]),
        "report_date": str(df.index[-1]),
        "open_interest_all": int(oi),
        "lf_long": int(lf_long),
        "lf_short": int(lf_short),
        "lf_net": int(lf_net),
        "lf_net_pct_oi": round(lf_net / oi * 100, 1) if oi else None,
        "lf_net_prev": int(lf_net_prev) if lf_net_prev is not None else None,
        "am_long": int(am_long),
        "am_short": int(am_short),
        "am_net": int(am_long - am_short),
        "reading": reading,
    }
    with open(f"{OUT_DIR}/cot.json", "w") as f:
        json.dump([row], f, indent=2, ensure_ascii=False)
    print(f"cot.json atualizado: report_week={row['report_week']}")


def update_fomc():
    df = obb.federal_reserve.fomc_documents(provider="federal_reserve").to_dataframe().sort_index()
    rows = []
    labels = {
        "monetary_policy": "Ultimo comunicado de politica monetaria",
        "press_conference": "Press conference (Fed chair)",
        "beige_book": "Beige Book",
        "minutes": "Ultimas minutas publicadas",
    }
    for doc_type, label in labels.items():
        sub = df[df["doc_type"] == doc_type]
        if not sub.empty:
            d = sub.index[-1]
            rows.append({"date": str(d.date()) if hasattr(d, "date") else str(d), "doc_type": doc_type,
                         "label": label, "url": sub.iloc[-1]["url"]})
    rows.sort(key=lambda r: r["date"], reverse=True)
    with open(f"{OUT_DIR}/fomc.json", "w") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"fomc.json atualizado: {len(rows)} documentos")


def update_econ_calendar():
    raw = None
    for attempt in range(4):
        raw = econ_calendar.sh(["curl", "-sS", "--max-time", "20", econ_calendar.URL])
        if raw.strip():
            break
        time.sleep(3)
    events = json.loads(raw)
    filtered = [e for e in events if e["country"] in econ_calendar.RELEVANT_CURRENCIES and e["impact"] in econ_calendar.RELEVANT_IMPACT]
    filtered.sort(key=lambda e: e["date"])
    with open(f"{OUT_DIR}/econ_calendar.json", "w") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)
    print(f"econ_calendar.json atualizado: {len(filtered)} eventos")


def run_step(name, fn):
    try:
        fn()
    except Exception as exc:
        print(f"AVISO: passo '{name}' falhou, a continuar com os restantes: {exc}", file=sys.stderr)


if __name__ == "__main__":
    # correm sempre (rapidos, sem rate-limit observado): precos/GEX/VIX/heatmap
    run_step("levels", update_levels)
    run_step("price_nq", price_history.export_qqq)
    run_step("price_nq_daily", price_history.export_qqq_daily)
    run_step("price_btc", price_history.export_btc)
    run_step("vix_history", price_history.export_vix)
    run_step("gex_heatmap_nq", gex_heatmap.export_nq)
    run_step("gex_heatmap_btc", gex_heatmap.export_btc)

    # COT/FOMC/calendario mudam pouco (semanal/raro) e o feed do calendario
    # tem rate-limit agressivo -- so correm ~1x/hora mesmo que o script seja
    # chamado de 15 em 15 min, para nao gastar a quota com chamadas repetidas.
    if "--full" in sys.argv or datetime.datetime.utcnow().minute < 15:
        run_step("cot", update_cot)
        run_step("fomc", update_fomc)
        run_step("econ_calendar", update_econ_calendar)

    print("\nExport completo.")
