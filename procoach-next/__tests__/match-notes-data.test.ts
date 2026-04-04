import { describe, it, expect } from 'vitest'
import { actaToWizardEvents, actaToWizardLineups } from '@/lib/match-notes-data'
import type { ActaData } from '@/lib/match-notes-types'

const sampleActa: ActaData = {
  goals: [
    { player: 'FONT FARRE, JOSEP', minute: '23', team: 'home' },
    { player: 'GARCIA LOPEZ, MARC', minute: '67', team: 'away' },
  ],
  yellow_cards: [
    { player: 'MARTINEZ PUIG, POL', minute: '34', team: 'home' },
    { player: 'SOLER VIDAL, ARNAU', minute: '55', team: 'away' },
    { player: 'ROMERO GIL, DAVID', minute: '78', team: 'home', is_double_yellow_dismissal: true },
  ],
  red_cards: [
    { player: 'SANCHEZ RUIZ, CARLOS', minute: '89', team: 'away' },
  ],
  substitutions: [
    { player_out: 'FONT FARRE, JOSEP', player_in: 'PUIG SERRA, ALEX', minute: '70', team: 'home' },
  ],
  home_lineup: [
    { name: 'TORRES MAS, PAU', number: 1, is_starter: true },
    { name: 'FONT FARRE, JOSEP', number: 9, is_starter: true },
    { name: 'MARTINEZ PUIG, POL', number: 6, is_starter: true },
    { name: 'ROMERO GIL, DAVID', number: 5, is_starter: true },
    { name: 'VILA ROCA, ORIOL', number: 3, is_starter: true },
    { name: 'PRATS BOSCH, ERIC', number: 7, is_starter: true },
    { name: 'SERRA COLL, ADRIA', number: 8, is_starter: true },
    { name: 'COSTA FERRER, JOAN', number: 10, is_starter: true },
    { name: 'RIUS PEREZ, BIEL', number: 11, is_starter: true },
    { name: 'CAMPS LLUCH, NIL', number: 4, is_starter: true },
    { name: 'SOLER ROIG, MARC', number: 2, is_starter: true },
  ],
  away_lineup: [
    { name: 'GARCIA LOPEZ, MARC', number: 9, is_starter: true },
    { name: 'SOLER VIDAL, ARNAU', number: 6, is_starter: true },
    { name: 'SANCHEZ RUIZ, CARLOS', number: 5, is_starter: true },
  ],
  home_bench: [
    { name: 'PUIG SERRA, ALEX', number: 14, is_starter: false },
  ],
  away_bench: [],
}

describe('actaToWizardEvents', () => {
  it('converts goals from both teams when isHome=true', () => {
    const events = actaToWizardEvents(sampleActa, true)
    const goals = events.filter(e => e.event_type === 'goal')
    expect(goals).toHaveLength(2)

    // Home goal → not opponent
    const homeGoal = goals.find(g => g.player_name === 'Josep Font Farre')
    expect(homeGoal).toBeDefined()
    expect(homeGoal!.is_opponent).toBe(false)
    expect(homeGoal!.minute).toBe(23)

    // Away goal → is opponent
    const awayGoal = goals.find(g => g.player_name === 'Marc Garcia Lopez')
    expect(awayGoal).toBeDefined()
    expect(awayGoal!.is_opponent).toBe(true)
    expect(awayGoal!.minute).toBe(67)
  })

  it('converts goals with flipped perspective when isHome=false', () => {
    const events = actaToWizardEvents(sampleActa, false)
    const goals = events.filter(e => e.event_type === 'goal')

    const homeGoal = goals.find(g => g.player_name === 'Josep Font Farre')
    expect(homeGoal!.is_opponent).toBe(true) // now opponent

    const awayGoal = goals.find(g => g.player_name === 'Marc Garcia Lopez')
    expect(awayGoal!.is_opponent).toBe(false) // now own team
  })

  it('converts yellow cards (non-double-yellow ones stay as yellow)', () => {
    const events = actaToWizardEvents(sampleActa, true)
    const yellows = events.filter(e => e.event_type === 'yellow_card')
    // Martinez (home, regular yellow) + Soler (away, regular yellow) = 2
    expect(yellows).toHaveLength(2)

    const homeYellow = yellows.find(g => g.player_name === 'Pol Martinez Puig')
    expect(homeYellow).toBeDefined()
    expect(homeYellow!.is_opponent).toBe(false)

    const awayYellow = yellows.find(g => g.player_name === 'Arnau Soler Vidal')
    expect(awayYellow).toBeDefined()
    expect(awayYellow!.is_opponent).toBe(true)
  })

  it('converts double yellow as red card', () => {
    const events = actaToWizardEvents(sampleActa, true)
    const reds = events.filter(e => e.event_type === 'red_card')
    // Should include: Romero (double yellow) + Sanchez (straight red) + Soler (double yellow misclassified? let me check)
    // Actually: yellows loop: Martinez (yellow), Soler (yellow, away), Romero (double_yellow → red)
    // reds loop: Sanchez (red)
    expect(reds.length).toBeGreaterThanOrEqual(2)

    const doubleYellow = reds.find(r => r.player_name === 'David Romero Gil')
    expect(doubleYellow).toBeDefined()
    expect(doubleYellow!.note).toBe('Doble groga')
  })

  it('converts substitutions', () => {
    const events = actaToWizardEvents(sampleActa, true)
    const subs = events.filter(e => e.event_type === 'substitution')
    expect(subs).toHaveLength(1)
    expect(subs[0].player_name).toBe('Alex Puig Serra') // player_in
    expect(subs[0].secondary_player).toBe('Josep Font Farre') // player_out
    expect(subs[0].minute).toBe(70)
    expect(subs[0].is_opponent).toBe(false)
  })

  it('sorts events by minute', () => {
    const events = actaToWizardEvents(sampleActa, true)
    for (let i = 1; i < events.length; i++) {
      expect(events[i].minute).toBeGreaterThanOrEqual(events[i - 1].minute)
    }
  })

  it('formats FCF names from "SURNAME, NAME" to "Name Surname"', () => {
    const events = actaToWizardEvents(sampleActa, true)
    const goal = events.find(e => e.event_type === 'goal' && !e.is_opponent)
    expect(goal!.player_name).toBe('Josep Font Farre')
  })

  it('returns empty array for empty acta', () => {
    const emptyActa: ActaData = {
      goals: [], yellow_cards: [], red_cards: [], substitutions: [],
      home_lineup: [], away_lineup: [], home_bench: [], away_bench: [],
    }
    expect(actaToWizardEvents(emptyActa, true)).toEqual([])
  })
})

describe('actaToWizardLineups', () => {
  it('creates 11 starters + bench from home lineup (4-3-3)', () => {
    const lineups = actaToWizardLineups(sampleActa, true, '4-3-3')
    const starters = lineups.filter(l => l.is_starter)
    const bench = lineups.filter(l => !l.is_starter)

    expect(starters).toHaveLength(11)
    expect(bench).toHaveLength(1) // 1 home bench player
  })

  it('assigns formation positions to starters', () => {
    const lineups = actaToWizardLineups(sampleActa, true, '4-3-3')
    const starters = lineups.filter(l => l.is_starter)

    // First starter should be GK
    expect(starters[0].role).toBe('GK')
    expect(starters[0].position_x).toBe(0.5)
    expect(starters[0].position_y).toBe(0.06)

    // All starters should have coordinates
    for (const s of starters) {
      expect(s.position_x).not.toBeNull()
      expect(s.position_y).not.toBeNull()
    }
  })

  it('bench players have null coordinates', () => {
    const lineups = actaToWizardLineups(sampleActa, true, '4-3-3')
    const bench = lineups.filter(l => !l.is_starter)

    for (const b of bench) {
      expect(b.position_x).toBeNull()
      expect(b.position_y).toBeNull()
      expect(b.role).toBeNull()
    }
  })

  it('formats player names correctly', () => {
    const lineups = actaToWizardLineups(sampleActa, true, '4-3-3')
    expect(lineups[0].player_name).toBe('Pau Torres Mas')
  })

  it('defaults attendance to present', () => {
    const lineups = actaToWizardLineups(sampleActa, true, '4-3-3')
    for (const l of lineups) {
      expect(l.attendance).toBe('present')
    }
  })

  it('uses away lineup when isHome=false', () => {
    const lineups = actaToWizardLineups(sampleActa, false, '4-3-3')
    // Away lineup only has 3 starters, so remaining positions will have empty names
    const nonEmpty = lineups.filter(l => l.player_name !== '')
    expect(nonEmpty.length).toBe(3) // 3 away starters
  })

  it('falls back to 4-3-3 for unknown formation', () => {
    const lineups = actaToWizardLineups(sampleActa, true, 'unknown-formation')
    const starters = lineups.filter(l => l.is_starter)
    expect(starters).toHaveLength(11) // Falls back to 4-3-3
    expect(starters[0].role).toBe('GK')
  })
})
