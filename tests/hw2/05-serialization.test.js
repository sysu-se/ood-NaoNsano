import { describe, expect, it } from 'vitest'
import { loadDomainApi } from '../hw1/helpers/domain-api.js'

const emptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0))

describe('HW2 exploration serialization', () => {
  it('round-trips active exploration state and failed paths', async () => {
    const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyGrid()) })

    game.startExplore()
    game.guess({ row: 0, col: 0, value: 1 })
    game.markExploreFailed()
    game.guess({ row: 0, col: 1, value: 2 })
    game.undo()

    const restored = createGameFromJSON(JSON.parse(JSON.stringify(game.toJSON())))

    expect(restored.isExploring()).toBe(true)
    expect(restored.getCurrentGrid()[0][0]).toBe(1)
    expect(restored.getCurrentGrid()[0][1]).toBe(0)
    expect(restored.isKnownFailedPath()).toBe(true)
    expect(restored.canRedo()).toBe(true)

    restored.backtrackExplore()
    expect(restored.getCurrentGrid()).toEqual(emptyGrid())
  })

  it('keeps legacy move serialization compatible', async () => {
    const { createGameFromJSON } = await loadDomainApi()

    const restored = createGameFromJSON({
      initialGrid: emptyGrid(),
      moves: [{ row: 0, col: 0, value: 1 }],
      redoMoves: [{ row: 0, col: 1, value: 2 }],
    })

    expect(restored.getCurrentGrid()[0][0]).toBe(1)
    expect(restored.canRedo()).toBe(true)
  })

  it('rejects exploration JSON with checkpointGrid inconsistent with moves', async () => {
    const { createGameFromJSON } = await loadDomainApi()
    const checkpointGrid = emptyGrid()

    expect(() => createGameFromJSON({
      initialGrid: emptyGrid(),
      moves: [{ row: 0, col: 0, value: 1 }],
      redoMoves: [],
      exploring: true,
      checkpointGrid,
      checkpointIndex: 1,
      exploreMoves: [],
      exploreRedoMoves: [],
    })).toThrow(/checkpointGrid is inconsistent/)
  })
})
