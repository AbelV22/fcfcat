import { describe, it, expect } from 'vitest'
import { slugify, COMPETITION_NAMES, COMPETITION_CATEGORY } from '@/lib/data'
import { slugify as utilsSlugify } from '@/lib/utils'

describe('slugify (data.ts version)', () => {
  it('matches the utils.ts slugify behavior', () => {
    const testCases = [
      'FC Barcelona',
      'UD Mataronesa A',
      'Barça Atlètic',
      "L'Hospitalet",
      'Peña Sport',
      '',
    ]
    for (const tc of testCases) {
      expect(slugify(tc)).toBe(utilsSlugify(tc))
    }
  })
})

describe('COMPETITION_NAMES', () => {
  it('has entries for all major adult competitions', () => {
    expect(COMPETITION_NAMES['tercera-federacio']).toBe('Tercera Federació')
    expect(COMPETITION_NAMES['primera-catalana']).toBe('Primera Catalana')
    expect(COMPETITION_NAMES['segona-catalana']).toBe('Segona Catalana')
    expect(COMPETITION_NAMES['tercera-catalana']).toBe('Tercera Catalana')
    expect(COMPETITION_NAMES['quarta-catalana']).toBe('Quarta Catalana')
  })

  it('has entries for youth categories', () => {
    expect(COMPETITION_NAMES['preferent-juvenils']).toBeDefined()
    expect(COMPETITION_NAMES['divisio-honor-cadet-s16']).toBeDefined()
    expect(COMPETITION_NAMES['divisio-honor-infantil-s14']).toBeDefined()
  })

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(COMPETITION_NAMES)) {
      expect(value).toBeTruthy()
      expect(typeof value).toBe('string')
    }
  })

  it('has at least 20 competitions', () => {
    expect(Object.keys(COMPETITION_NAMES).length).toBeGreaterThanOrEqual(20)
  })
})

describe('COMPETITION_CATEGORY', () => {
  it('maps competitions to age categories', () => {
    expect(COMPETITION_CATEGORY['segona-catalana']).toBe('adult')
    expect(COMPETITION_CATEGORY['preferent-juvenils']).toBe('juvenil')
    expect(COMPETITION_CATEGORY['divisio-honor-cadet-s16']).toBe('cadet')
    expect(COMPETITION_CATEGORY['divisio-honor-infantil-s14']).toBe('infantil')
  })

  it('every COMPETITION_NAMES key has a category', () => {
    for (const key of Object.keys(COMPETITION_NAMES)) {
      expect(COMPETITION_CATEGORY[key]).toBeDefined()
    }
  })

  it('only uses valid category values', () => {
    const validCategories = new Set(['adult', 'juvenil', 'cadet', 'infantil'])
    for (const cat of Object.values(COMPETITION_CATEGORY)) {
      expect(validCategories.has(cat)).toBe(true)
    }
  })
})
