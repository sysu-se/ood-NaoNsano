import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

const solvedGrid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

const otherSolvedGrid = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
]

describe('HW1 game undo / redo', () => {
  it('supports a basic guess -> undo -> redo flow', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.canUndo()).toBe(true)

    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
    expect(game.canRedo()).toBe(true)

    game.redo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
  })

  it('supports multiple undo steps in reverse order', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.getSudoku().getGrid()[1][1]).toBe(7)

    game.undo()
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)

    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('clears redo history after a new move following undo', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    game.undo()
    expect(game.canRedo()).toBe(true)

    game.guess({ row: 2, col: 0, value: 1 })
    expect(game.canRedo()).toBe(false)
    expect(game.getSudoku().getGrid()[2][0]).toBe(1)
  })

  it('rejects edits to given cells', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(() => game.guess({ row: 0, col: 0, value: 9 })).toThrow(/given cell/)
    expect(game.getSudoku().getGrid()[0][0]).toBe(5)
  })

  it('allows conflicting guesses on non-given cells and exposes unified state', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 5 })

    let state = game.getState()
    expect(state.grid[0][2]).toBe(5)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(false)
    expect(state.isWon).toBe(false)
    expect(state.conflicts).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    )

    game.undo()
    state = game.getState()
    expect(state.grid[0][2]).toBe(0)
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(true)
    expect(state.conflicts).toEqual([])

    game.redo()
    expect(game.getState().grid[0][2]).toBe(5)
  })

  it('rejects an initial puzzle with conflicting givens', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const puzzle = makePuzzle()
    puzzle[0][2] = 5

    expect(() => createGame({ sudoku: createSudoku(puzzle) })).toThrow(/conflicting given/)
  })

  it('keeps conflicting in-progress boards usable for state inspection and history', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 5 })

    expect(game.getSudoku().getGrid()[0][2]).toBe(5)
    expect(game.getCurrentGrid()[0][2]).toBe(5)
    expect(game.getState().conflicts).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    )

    game.undo()
    expect(game.getCurrentGrid()[0][2]).toBe(0)

    game.redo()
    expect(game.getCurrentGrid()[0][2]).toBe(5)
  })

  it('generates hints without mutating state', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    const hint = game.getHint(0, 2, () => solvedGrid)

    expect(hint).toEqual({ row: 0, col: 2, value: 4 })
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('validates solver output against the original board snapshot', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(() => game.getHint(0, 2, (grid) => {
      for (let row = 0; row < 9; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          if (grid[row][col] !== 0) {
            grid[row][col] = otherSolvedGrid[row][col]
          }
        }
      }

      return otherSolvedGrid
    })).toThrow(/preserve existing cell/)

    expect(game.getCurrentGrid()).toEqual(makePuzzle())
  })

  it('rejects hints for givens, filled cells, and invalid solver output', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(() => game.getHint(0, 0, () => solvedGrid)).toThrow(/given cell/)

    game.guess({ row: 0, col: 2, value: 4 })
    expect(() => game.getHint(0, 2, () => solvedGrid)).toThrow(/filled cell/)

    const invalidSolverGame = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(() => invalidSolverGame.getHint(0, 2, () => {
      const invalid = solvedGrid.map((row) => row.slice())
      invalid[0][2] = 0
      return invalid
    })).toThrow(/complete grid/)
  })

  it('rejects hints when the board or solver result is inconsistent', async () => {
    const { createGame, createSudoku } = await loadDomainApi()

    const conflictingGame = createGame({ sudoku: createSudoku(makePuzzle()) })
    conflictingGame.guess({ row: 0, col: 2, value: 5 })
    expect(() => conflictingGame.getHint(1, 1, () => solvedGrid)).toThrow(/conflicting board/)

    const incompleteSolverGame = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(() => incompleteSolverGame.getHint(0, 2, () => {
      const incomplete = solvedGrid.map((row) => row.slice())
      incomplete[8][8] = 0
      return incomplete
    })).toThrow(/complete grid/)

    const conflictingSolverGame = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(() => conflictingSolverGame.getHint(0, 2, () => {
      const invalid = solvedGrid.map((row) => row.slice())
      invalid[8][8] = 8
      return invalid
    })).toThrow(/conflict-free grid/)

    const changedExistingCellGame = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(() => changedExistingCellGame.getHint(0, 2, () => otherSolvedGrid)).toThrow(/preserve existing cell/)
  })
})
