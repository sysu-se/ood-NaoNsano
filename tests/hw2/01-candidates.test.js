import { describe, expect, it } from 'vitest'
import { makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 candidate calculation', () => {
  it('calculates candidates for one cell and all empty cells', async () => {
    const { getAllCandidates, getCandidates } = await import('../../src/domain/index.js')
    const puzzle = makePuzzle()

    expect(getCandidates(puzzle, 0, 2)).toEqual([1, 2, 4])
    expect(getCandidates(puzzle, 0, 0)).toEqual([])

    const allCandidates = getAllCandidates(puzzle)
    expect(allCandidates).toBeInstanceOf(Map)
    expect(allCandidates.get('0,2')).toEqual([1, 2, 4])
    expect(allCandidates.has('0,0')).toBe(false)
  })

  it('finds naked and hidden singles with reasons', async () => {
    const { findHiddenSingles, findNakedSingles } = await import('../../src/domain/index.js')
    const puzzle = makePuzzle()

    expect(findNakedSingles(puzzle)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 4, col: 4, value: 5 }),
      ]),
    )

    expect(findHiddenSingles(puzzle)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, col: 6, value: 5 }),
      ]),
    )
  })
})
