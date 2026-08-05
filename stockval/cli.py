"""CLI para validar rapidamente no servidor: python cli.py AAPL"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import Assumptions          # noqa: E402
from app.prices import get_price            # noqa: E402
from app.sec import fetch                   # noqa: E402
from app.valuation import Fundamentals, value_company  # noqa: E402


def main() -> None:
    ticker = (sys.argv[1] if len(sys.argv) > 1 else "AAPL").upper()
    data = fetch(ticker)
    if data.get("error"):
        print("ERRO:", data["error"])
        return
    price = get_price(ticker)
    print(f"\n{data['name']} ({ticker})   preço = {price}")
    keys = ("fcf", "net_income", "equity", "total_debt", "cash", "shares", "eff_tax", "cost_of_debt")
    for k in keys:
        print(f"  {k:>13}: {data.get(k)}")
    if data.get("missing"):
        print("  EM FALTA:", data["missing"])
    if price is None or data.get("fcf") is None or not data.get("shares"):
        print("\n>> dados insuficientes para valuation.")
        return
    f = Fundamentals(
        price=price, shares=data["shares"], fcf=data["fcf"],
        net_income=data["net_income"] or 0.0, equity=data["equity"] or 0.0,
        total_debt=data["total_debt"], cash=data["cash"],
        eff_tax=data["eff_tax"], cost_of_debt=data["cost_of_debt"],
        fcf_history=data["fcf_history"],
    )
    r = value_company(f, Assumptions())
    iv = r["intrinsic_per_share"]
    print(f"\n  VALOR INTRÍNSECO / ação: {iv:.2f}" if iv else "\n  valor intrínseco: n/a")
    if iv:
        print(f"  preço: {r['price']:.2f}   upside: {r['upside']*100:+.1f}%   "
              f"margem seg.: {r['margin_of_safety']*100:+.1f}%   -> {r['verdict']}")
    print(f"  WACC: {r['wacc']*100:.2f}%   crescimento: {r['growth_used']*100:.1f}% ({r['growth_source']})")
    print("  rácios:", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in r["ratios"].items()})


if __name__ == "__main__":
    main()
