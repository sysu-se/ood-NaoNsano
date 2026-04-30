import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 game hints', () => {
  it('exposes candidates and keeps hint lookup side-effect free', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.getCellCandidates(0, 2)).toEqual([1, 2, 4])
    expect(game.getCellCandidates(0, 0)).toEqual([])

    const before = game.getCurrentGrid()
    const positionHint = game.getNextHint('position')
    const answerHint = game.getNextHint('answer')

    expect(positionHint).toEqual(expect.objectContaining({
      row: 4,
      col: 4,
      value: null,
      technique: 'naked-single',
      level: 'position',
    }))
    expect(answerHint).toEqual(expect.objectContaining({
      row: 4,
      col: 4,
      value: 5,
      technique: 'naked-single',
      level: 'answer',
    }))
    expect(game.getCurrentGrid()).toEqual(before)
  })

  it('applies only answer-level hints through explicit command methods', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const positionHint = game.getNextHint('position')

    expect(() => game.applyHint(positionHint)).toThrow(/answer-level/)

    const applied = game.applyNextHint()
    expect(applied).toEqual(expect.objectContaining({ row: 4, col: 4, value: 5 }))
    expect(game.getCurrentGrid()[4][4]).toBe(5)
    expect(game.canUndo()).toBe(true)
  })
})
