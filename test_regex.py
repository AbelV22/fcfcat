import re

html_block = '''0 - 1</div>
</td>
<td><img class="acta-escut-gol" src="https://files.fcf.cat/escudos/clubes/escudos/00100_0000817600_faf_200.png"/></td>
<td>
<a href="https://www.fcf.cat/jugador/2526/futbol-11/segona-catalana/grup-3/54322941/15660973">BENAICHA SIDI BEN BRAHIM, RACHID
									</a></td>
<td>12'</td>
</tr>'''

score_match = re.search(r'^\s*(\d+)\s*[-–]\s*(\d+)\s*<', html_block)
print('Score match:', score_match.groups() if score_match else None)

name_match = re.search(r'<a href="[^"]*jugador[^"]*">([^<]+)', html_block)
print('Name match:', name_match.group(1).strip() if name_match else None)

min_match = re.search(r'<td>\s*(\d+)[\'\u2032]?\s*</td>', html_block)
print('Min match:', min_match.group(1).strip() if min_match else None)

print("\n--- Card Testing ---")
# Test card color detection
red_card_row = '''<td class="white oswald tc p-r z-0 w-44px">
<span class="num-samarreta-acta2">24</span>
<div class="samarreta-acta2"><span class="p-a faf-base" style="color:#FF0000;"></span><td><a href="...">JIMENEZ</a></td>
</div>'''

yellow_card_row = '''<td class="white oswald tc p-r z-0 w-44px">
<span class="num-samarreta-acta2">7</span>
<div class="samarreta-acta2"><span class="p-a faf-base" style="color:#222222;"></span><td><a href="...">BENAICHA</a></td>
</div>'''

def is_red_card(row_html):
    return "vermell" in row_html.lower() or "roja" in row_html.lower() or "#ff0000" in row_html.lower()

print("Red card row identified as red:", is_red_card(red_card_row))
print("Yellow card row identified as red:", is_red_card(yellow_card_row))
