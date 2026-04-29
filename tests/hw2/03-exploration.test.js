import { describe, expect, it } from 'vitest'
import { loadDomainApi } from '../hw1/helpers/domain-api.js'

const emptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0))

describe('HW2 exploration mode', () => {
  it('starts, detects conflicts, remembers failed paths, and backtracks', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyGrid()) })

    expect(game.canExplore()).toBe(true)
    game.startExplore()
    expect(game.isExploring()).toBe(true)

    game.guess({ row: 0, col: 0, value: 1 })
    game.guess({ row: 0, col: 1, value: 1 })
    expect(game.isExploreFailed()).toBe(true)

    game.markExploreFailed()
    expect(game.isKnownFailedPath()).toBe(true)

    game.backtrackExplore()
    expect(game.getCurrentGrid()).toEqual(emptyGrid())
    expect(game.isExploring()).toBe(true)
    expect(game.getState().exploreMoveCount).toBe(0)

    game.guess({ row: 0, col: 0, value: 1 })
    game.guess({ row: 0, col: 1, value: 1 })
    expect(game.isKnownFailedPath()).toBe(true)
  })

  it('commits and abandons exploration against the checkpoint', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyGrid()) })

    game.startExplore()
    game.guess({ row: 0, col: 0, value: 1 })
    game.commitExplore()
    expect(game.isExploring()).toBe(false)
    expect(game.getCurrentGrid()[0][0]).toBe(1)
    expect(game.canUndo()).toBe(true)

    game.startExplore()
    game.guess({ row: 0, col: 1, value: 2 })
    game.abandonExplore()
    expect(game.isExploring()).toBe(false)
    expect(game.getCurrentGrid()[0][0]).toBe(1)
    expect(game.getCurrentGrid()[0][1]).toBe(0)
  })
})
