"""
Team-slug helpers — Python mirror of procoach-next/lib/team-slug.ts.

A team URL slug has the form `${base}-${comp_code}-g${group_number}` so that
the same club's Cadet/Juvenil/Infantil teams get distinct slugs. Keep both
modules in sync whenever the competition table changes.
"""
from __future__ import annotations

import re
import unicodedata

# Short codes for every competition in procoach-next/lib/competitions.ts
COMPETITION_SHORT_CODE: dict[str, str] = {
    # Adult
    "tercera-federacio": "tf",
    "lliga-elit": "le",
    "primera-catalana": "1c",
    "segona-catalana": "2c",
    "tercera-catalana": "3c",
    "quarta-catalana": "4c",
    # Juvenil
    "divisio-honor-juvenil": "dhj",
    "lliga-nacional-juvenil": "lnj",
    "preferent-juvenils": "pj",
    "juvenil-primera-divisio": "j1",
    "segona-catalana-juvenil": "j2",
    "tercera-catalana-juvenil": "j3",
    # Cadet S16
    "divisio-honor-cadet-s16": "dhc16",
    "preferent-cadet-s16": "pc16",
    "cadet-primera-divisio-s16": "c1-16",
    "cadet-segona-divisio-s16": "c2-16",
    # Cadet S15
    "divisio-honor-cadet-s15": "dhc15",
    "preferent-cadet-s15": "pc15",
    "cadet-primera-divisio-s15": "c1-15",
    "cadet-segona-divisio-s15": "c2-15",
    # Infantil S14
    "divisio-honor-infantil-s14": "dhi14",
    "preferent-infantil-s14": "pi14",
    "primera-divisio-infantil-s14": "i1-14",
    # Infantil S13
    "divisio-honor-infantil-s13": "dhi13",
    "preferent-infantil-s13": "pi13",
    "infantil-primera-divisio-s13": "i1-13",
}


def base_slugify(text: str) -> str:
    """Lowercase, strip accents, keep [a-z0-9], collapse hyphens. Same as lib/data.ts:slugify."""
    if not text:
        return ""
    t = text.lower()
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9\s-]", "", t)
    t = t.strip()
    t = re.sub(r"\s+", "-", t)
    t = re.sub(r"-+", "-", t)
    return t


def group_number(group: str) -> int:
    """'grup-3' -> 3, 'grup-10' -> 10, '' -> 1."""
    m = re.search(r"(\d+)", group or "")
    return int(m.group(1)) if m else 1


def compose_team_slug(team_name: str, competition: str, group: str) -> str:
    """Canonical team slug used in URLs and Supabase."""
    base = base_slugify(team_name)
    code = COMPETITION_SHORT_CODE.get(competition) or base_slugify(competition)
    g = group_number(group)
    return f"{base}-{code}-g{g}"
