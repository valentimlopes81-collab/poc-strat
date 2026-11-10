"""Calendario macro via o feed JSON publico do ForexFactory (o mesmo que os
widgets embutidos usam, sem login/API key). Substitui a pesquisa web para
esta camada, que ficava sistematicamente sem confirmar datas exatas (ver
quant_bias.md 10/11).

Uso: python3 backtest/quant/econ_calendar.py
"""
import json
import subprocess
import sys

URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
RELEVANT_CURRENCIES = {"USD", "All"}
RELEVANT_IMPACT = {"Medium", "High"}


def sh(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"cmd failed: {cmd} stderr={out.stderr[:300]}")
    return out.stdout


def main():
    raw = sh(["curl", "-sS", "--max-time", "20", URL])
    events = json.loads(raw)
    filtered = [e for e in events if e["country"] in RELEVANT_CURRENCIES and e["impact"] in RELEVANT_IMPACT]
    filtered.sort(key=lambda e: e["date"])

    print(f"Eventos macro relevantes esta semana (USD, impacto Medio/Alto): {len(filtered)}")
    for e in filtered:
        print(f"  {e['date']}  [{e['impact']:<6}] {e['title']}"
              + (f"  (forecast {e['forecast']}, previous {e['previous']})" if e.get("forecast") or e.get("previous") else ""))

    with open("backtest/quant/econ_calendar_cache.json", "w") as f:
        json.dump(filtered, f, indent=2)


if __name__ == "__main__":
    main()
