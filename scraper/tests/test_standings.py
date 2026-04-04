"""Tests for standings parsing — _safe_int and TeamStanding validation."""
import pytest
from scraper.standings import _safe_int


class TestSafeInt:
    def test_simple_number(self):
        assert _safe_int("42") == 42

    def test_number_with_parentheses(self):
        assert _safe_int("42 (2.1)") == 42

    def test_float_number(self):
        assert _safe_int("42.00") == 42

    def test_empty_string(self):
        assert _safe_int("") == 0

    def test_whitespace_only(self):
        assert _safe_int("   ") == 0

    def test_invalid_text(self):
        assert _safe_int("abc") == 0

    def test_negative_number(self):
        assert _safe_int("-3") == -3

    def test_number_with_spaces(self):
        assert _safe_int("  12  ") == 12

    def test_decimal_rounding(self):
        assert _safe_int("7.9") == 7  # int(float("7.9")) = 7
