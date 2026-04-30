import { describe, expect, it } from 'vitest'
import { loadDomainApi } from '../hw1/helpers/domain-api.js'

const emptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0))

describe('HW2 exploration undo / redo', () => {
  it('keeps exploration history isolated from main history', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyGrid()) })

    game.guess({ row: 0, col: 0, value: 1 })
    game.startExplore()
    game.guess({ row: 0, col: 1, value: 2 })
    game.guess({ row: 0, col: 2, value: 3 })

    game.undo()
    expect(game.getCurrentGrid()[0][2]).toBe(0)
    expect(game.getCurrentGrid()[0][1]).toBe(2)
    expect(game.getCurrentGrid()[0][0]).toBe(1)
    expect(game.canRedo()).toBe(true)

    game.redo()
    expect(game.getCurrentGrid()[0][2]).toBe(3)

    game.abandonExplore()
    expect(game.getCurrentGrid()[0][0]).toBe(1)
    expect(game.getCurrentGrid()[0][1]).toBe(0)

    game.undo()
    expect(game.getCurrentGrid()[0][0]).toBe(0)
  })

  it('drops stale main redo history when committing an explored branch', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyGrid()) })

    game.guess({ row: 0, col: 0, value: 1 })
    game.guess({ row: 0, col: 1, value: 2 })
    game.undo()
    expect(game.canRedo()).toBe(true)

    game.startExplore()
    game.guess({ row: 1, col: 0, value: 3 })
    game.commitExplore()

    expect(game.getCurrentGrid()[0][1]).toBe(0)
    expect(game.getCurrentGrid()[1][0]).toBe(3)
    expect(game.canRedo()).toBe(false)
  })
})
