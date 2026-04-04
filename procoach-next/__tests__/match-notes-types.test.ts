import { describe, it, expect } from 'vitest'
import {
  FORMATIONS,
  PLAYER_TAGS,
  EVENT_LABELS,
  GOAL_TYPE_LABELS,
  GOAL_ORIGIN_LABELS,
  TACTICAL_LABELS,
  PHASE_LABELS,
  EVENT_CATEGORIES,
  WEATHER_OPTIONS,
  PITCH_CONDITION_OPTIONS,
} from '@/lib/match-notes-types'

describe('FORMATIONS', () => {
  it('has all 7 standard formations', () => {
    const expected = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2', '4-1-4-1']
    for (const f of expected) {
      expect(FORMATIONS).toHaveProperty(f)
    }
  })

  it('each formation has exactly 11 positions', () => {
    for (const [name, positions] of Object.entries(FORMATIONS)) {
      expect(positions).toHaveLength(11)
    }
  })

  it('every formation starts with a goalkeeper', () => {
    for (const [name, positions] of Object.entries(FORMATIONS)) {
      expect(positions[0].role).toBe('GK')
    }
  })

  it('position coordinates are within 0-1 range', () => {
    for (const [name, positions] of Object.entries(FORMATIONS)) {
      for (const pos of positions) {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThanOrEqual(1)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('every position has a role and label', () => {
    for (const positions of Object.values(FORMATIONS)) {
      for (const pos of positions) {
        expect(pos.role).toBeTruthy()
        expect(pos.label).toBeTruthy()
      }
    }
  })
})

describe('PLAYER_TAGS', () => {
  it('has at least 10 tags', () => {
    expect(PLAYER_TAGS.length).toBeGreaterThanOrEqual(10)
  })

  it('each tag has key, label, and color', () => {
    for (const tag of PLAYER_TAGS) {
      expect(tag.key).toBeTruthy()
      expect(tag.label).toBeTruthy()
      expect(tag.color).toBeTruthy()
    }
  })

  it('has unique keys', () => {
    const keys = PLAYER_TAGS.map(t => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('labels are in Catalan', () => {
    const catalanLabels = PLAYER_TAGS.map(t => t.label)
    expect(catalanLabels).toContain('Golejador')
    expect(catalanLabels).toContain('Lideratge')
    expect(catalanLabels).toContain('Creatiu')
  })
})

describe('EVENT_LABELS', () => {
  it('has labels for core event types', () => {
    expect(EVENT_LABELS.goal).toBe('Gol')
    expect(EVENT_LABELS.yellow_card).toBe('Targeta groga')
    expect(EVENT_LABELS.red_card).toBe('Targeta vermella')
    expect(EVENT_LABELS.substitution).toBe('Substitucio')
  })
})

describe('GOAL_TYPE_LABELS', () => {
  it('covers all goal types', () => {
    expect(GOAL_TYPE_LABELS.right_foot).toBe('Peu dret')
    expect(GOAL_TYPE_LABELS.header).toBe('Cap')
    expect(GOAL_TYPE_LABELS.penalty).toBe('Penal')
    expect(GOAL_TYPE_LABELS.own_goal).toBe('Propia porta')
  })
})

describe('GOAL_ORIGIN_LABELS', () => {
  it('covers all goal origins', () => {
    expect(GOAL_ORIGIN_LABELS.open_play).toBe('Joc obert')
    expect(GOAL_ORIGIN_LABELS.counter_attack).toBe('Contraatac')
  })
})

describe('TACTICAL_LABELS', () => {
  it('has all four tactical approaches', () => {
    expect(Object.keys(TACTICAL_LABELS)).toHaveLength(4)
    expect(TACTICAL_LABELS.possession).toBe('Possessio')
    expect(TACTICAL_LABELS['high-press']).toBe('Pressing alt')
  })
})

describe('PHASE_LABELS', () => {
  it('has all five phases', () => {
    expect(Object.keys(PHASE_LABELS)).toHaveLength(5)
    expect(PHASE_LABELS.phase_attack).toBe('Atac')
    expect(PHASE_LABELS.phase_defense).toBe('Defensa')
  })
})

describe('EVENT_CATEGORIES', () => {
  it('groups events into categories', () => {
    expect(EVENT_CATEGORIES.key).toContain('goal')
    expect(EVENT_CATEGORIES.discipline).toContain('yellow_card')
    expect(EVENT_CATEGORIES.discipline).toContain('red_card')
    expect(EVENT_CATEGORIES.shots).toContain('shot_on_target')
  })

  it('has no duplicate events across categories', () => {
    const all = Object.values(EVENT_CATEGORIES).flat()
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('WEATHER_OPTIONS', () => {
  it('has at least 4 options', () => {
    expect(WEATHER_OPTIONS.length).toBeGreaterThanOrEqual(4)
  })

  it('each option has value, label, and emoji', () => {
    for (const opt of WEATHER_OPTIONS) {
      expect(opt.value).toBeTruthy()
      expect(opt.label).toBeTruthy()
      expect(opt.emoji).toBeTruthy()
    }
  })
})

describe('PITCH_CONDITION_OPTIONS', () => {
  it('has 3 conditions (good/average/poor)', () => {
    expect(PITCH_CONDITION_OPTIONS).toHaveLength(3)
    const values = PITCH_CONDITION_OPTIONS.map(o => o.value)
    expect(values).toContain('good')
    expect(values).toContain('average')
    expect(values).toContain('poor')
  })
})
