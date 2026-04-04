import { describe, it, expect } from 'vitest'
import { slugify } from '@/lib/utils'

describe('slugify', () => {
  it('converts basic text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('handles Catalan accented characters', () => {
    expect(slugify('Barça Atlètic')).toBe('barca-atletic')
    expect(slugify('Josep Fàbregas')).toBe('josep-fabregas')
    expect(slugify('Castelló dEmpúries')).toBe('castello-dempuries')
  })

  it('handles Spanish ñ and special chars', () => {
    expect(slugify('Peña Sport')).toBe('pena-sport')
    expect(slugify('Cañizares FC')).toBe('canizares-fc')
  })

  it('removes non-alphanumeric characters', () => {
    expect(slugify('FC Barcelona (B)')).toBe('fc-barcelona-b')
    expect(slugify("L'Hospitalet")).toBe('lhospitalet')
  })

  it('collapses multiple dashes', () => {
    expect(slugify('A  -  B')).toBe('a-b')
  })

  it('trims whitespace', () => {
    expect(slugify('  trimmed  ')).toBe('trimmed')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('handles all uppercase', () => {
    expect(slugify('UD MATARONESA A')).toBe('ud-mataronesa-a')
  })
})
