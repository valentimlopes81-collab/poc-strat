"""Formulas de backtest/quant/gex_common.py. Os valores de referencia em
GOLDEN sao os mesmos que terminal/tests/parity.test.js verifica no lado
JavaScript: se um dos dois mudar a matematica, o teste do outro falha."""
import datetime
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backtest" / "quant"))

import gex_common as g  # noqa: E402

S, K, T, IV = 665.0, 670.0, 20 / 365, 0.28

GOLDEN = {
    "gamma": 0.009142394620,
    "delta_call": 0.480828454388,
    "delta_put": -0.519171545612,
    "vanna": 0.161694546731,
    "charm": -0.656317263790,
}


def test_golden_values_shared_with_the_javascript_side():
    assert math.isclose(g.bs_gamma(S, K, T, IV), GOLDEN["gamma"], rel_tol=1e-9)
    assert math.isclose(g.bs_delta(S, K, T, IV, "C"), GOLDEN["delta_call"], rel_tol=1e-9)
    assert math.isclose(g.bs_delta(S, K, T, IV, "P"), GOLDEN["delta_put"], rel_tol=1e-9)
    assert math.isclose(g.bs_vanna(S, K, T, IV), GOLDEN["vanna"], rel_tol=1e-9)
    assert math.isclose(g.bs_charm(S, K, T, IV), GOLDEN["charm"], rel_tol=1e-9)


def _numeric(fn, x, h):
    return (fn(x + h) - fn(x - h)) / (2 * h)


def test_gamma_is_the_derivative_of_delta():
    assert math.isclose(g.bs_gamma(S, K, T, IV), _numeric(lambda s: g.bs_delta(s, K, T, IV, "C"), S, 0.01), rel_tol=1e-6)


def test_vanna_is_the_vol_derivative_of_delta():
    assert math.isclose(g.bs_vanna(S, K, T, IV), _numeric(lambda v: g.bs_delta(S, K, T, v, "C"), IV, 1e-5), rel_tol=1e-6)


def test_charm_is_minus_the_time_to_expiry_derivative_of_delta():
    assert math.isclose(g.bs_charm(S, K, T, IV), -_numeric(lambda t: g.bs_delta(S, K, t, IV, "P"), T, 1e-6), rel_tol=1e-5)


def test_time_floor_keeps_gamma_finite_at_expiry():
    assert g.bs_gamma(S, S, 0.0, IV) == g.bs_gamma(S, S, g.MIN_T_YEARS, IV)


def _row(strike, cp, oi):
    return {"strike": strike, "cp": cp, "oi": oi, "T": 10 / 365, "iv": 0.25}


def test_calls_add_to_gex_and_puts_subtract():
    assert g.total_gex_at_spot([_row(100, "C", 10)], 100) > 0
    assert g.total_gex_at_spot([_row(100, "P", 10)], 100) < 0
    assert abs(g.total_gex_at_spot([_row(100, "C", 10), _row(100, "P", 10)], 100)) < 1e-9


def test_walls():
    rows = [_row(95, "P", 900), _row(100, "C", 500), _row(100, "P", 200), _row(105, "C", 700)]
    call_wall, put_wall = g.call_put_walls(rows, 100)
    assert call_wall[0] == 105 and put_wall[0] == 95


def test_zero_gamma_sits_between_put_and_call_concentration():
    flips = g.find_zero_gamma([_row(95, "P", 1000), _row(105, "C", 1000)], 100)
    assert len(flips) == 1 and 95 < flips[0] < 105


def test_zero_gamma_falls_back_to_the_wide_sweep():
    # the only sign change is 20% away, outside the fine +/-12% window
    flips = g.find_zero_gamma([_row(118, "P", 1000), _row(122, "C", 1000)], 100)
    assert len(flips) == 1 and 118 < flips[0] < 122


def test_flow_signs_for_out_of_the_money_calls():
    rows = [_row(110, "C", 100)]
    assert g.vanna_flow(rows, 100) > 0  # vol down -> dealers long the call buy back delta
    assert g.charm_flow(rows, 100) > 0  # time passing does the same


def test_expiry_close_follows_new_york_daylight_saving():
    assert g.expiry_close_utc(datetime.date(2026, 11, 20)) == datetime.datetime(2026, 11, 20, 21, 0)
    assert g.expiry_close_utc(datetime.date(2026, 6, 19)) == datetime.datetime(2026, 6, 19, 20, 0)
