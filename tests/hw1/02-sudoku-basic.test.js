import { describe, expect, it } from 'vitest'
import { expectGrid9x9, loadDomainApi, makeMove, makePuzzle } from './helpers/domain-api.js'

const makeSolvedGrid = () => [
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

describe('HW1 sudoku basic behavior', () => {
  it('defensively copies the input grid on creation', async () => {
    const { createSudoku } = await loadDomainApi()
    const input = makePuzzle()
    const sudoku = createSudoku(input)

    input[0][0] = 9

    const grid = sudoku.getGrid()
    expectGrid9x9(grid)
    expect(grid[0][0]).toBe(5)
  })

  it('guess(move) updates the target cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    sudoku.guess(makeMove({ row: 0, col: 2, value: 4 }))

    const grid = sudoku.getGrid()
    expect(grid[0][2]).toBe(4)
  })

  it('guess(move) allows temporary conflicts for UI highlighting', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    sudoku.guess(makeMove({ row: 0, col: 2, value: 5 }))

    expect(sudoku.getGrid()[0][2]).toBe(5)
    expect(sudoku.getConflicts()).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    )
  })

  it('reports completion and solved state separately', async () => {
    const { createSudoku } = await loadDomainApi()
    const solved = createSudoku(makeSolvedGrid())
    const completeWithConflict = createSudoku(makeSolvedGrid())

    completeWithConflict.guess({ row: 0, col: 0, value: 3 })

    expect(solved.isComplete()).toBe(true)
    expect(solved.isSolved()).toBe(true)
    expect(completeWithConflict.isComplete()).toBe(true)
    expect(completeWithConflict.isSolved()).toBe(false)
  })

  it('getGrid returns a 9x9 numeric grid', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    expectGrid9x9(sudoku.getGrid())
  })

  it('toString() returns a readable string instead of [object Object]', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const text = sudoku.toString()

    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(20)
    expect(text).not.toBe('[object Object]')
  })

  it('toJSON() returns serializable plain data', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const json = sudoku.toJSON()

    expect(() => JSON.stringify(json)).not.toThrow()

    const roundTrip = JSON.parse(JSON.stringify(json))
    expect(roundTrip).toBeDefined()
  })
})
