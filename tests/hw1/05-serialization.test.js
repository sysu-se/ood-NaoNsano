import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 serialization / deserialization', () => {
  it('supports sudoku round-trip serialization', async () => {
    const { createSudoku, createSudokuFromJSON } = await loadDomainApi()

    const sudoku = createSudoku(makePuzzle())
    sudoku.guess({ row: 0, col: 2, value: 4 })

    const restored = createSudokuFromJSON(
      JSON.parse(JSON.stringify(sudoku.toJSON())),
    )

    expect(restored.getGrid()).toEqual(sudoku.getGrid())
    expect(typeof restored.toString()).toBe('string')
  })

  it('supports game round-trip serialization for the current board state', async () => {
    const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()

    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    const restored = createGameFromJSON(
      JSON.parse(JSON.stringify(game.toJSON())),
    )

    expect(restored.getSudoku().getGrid()).toEqual(game.getSudoku().getGrid())
  })

  it('restores old snapshot history format', async () => {
    const { createGameFromJSON } = await loadDomainApi()
    const initialGrid = makePuzzle()
    const nextGrid = initialGrid.map((row) => row.slice())
    nextGrid[0][2] = 4

    const restored = createGameFromJSON({
      history: [
        { grid: initialGrid },
        { grid: nextGrid },
      ],
      currentIndex: 1,
    })

    expect(restored.getSudoku().getGrid()[0][2]).toBe(4)
    expect(restored.canUndo()).toBe(true)
  })

  it('restores oldest sudoku.grid format', async () => {
    const { createGameFromJSON } = await loadDomainApi()
    const restored = createGameFromJSON({ sudoku: { grid: makePuzzle() } })

    expect(restored.getSudoku().getGrid()).toEqual(makePuzzle())
    expect(restored.getGivens().has('0,0')).toBe(true)
  })

  it('rejects serialized move history that modifies givens', async () => {
    const { createGameFromJSON } = await loadDomainApi()

    expect(() => createGameFromJSON({
      initialGrid: makePuzzle(),
      moves: [{ row: 0, col: 0, value: 9 }],
      redoMoves: [],
    })).toThrow(/given cell/)
  })

  it('rejects old snapshot history that modifies givens', async () => {
    const { createGameFromJSON } = await loadDomainApi()
    const initialGrid = makePuzzle()
    const nextGrid = initialGrid.map((row) => row.slice())
    nextGrid[0][0] = 9

    expect(() => createGameFromJSON({
      history: [
        { grid: initialGrid },
        { grid: nextGrid },
      ],
      currentIndex: 1,
    })).toThrow(/given cell/)
  })
})
