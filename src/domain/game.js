import { assertValidGrid, assertValidMove, cloneGrid } from './grid.js'
import { Sudoku } from './sudoku.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const cloneMove = (move) => ({ row: move.row, col: move.col, value: move.value })
const cloneMoves = (moves) => moves.map(cloneMove)
const cellKey = (row, col) => `${row},${col}`

const deriveGivens = (grid) => {
  const givens = new Set()

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col] !== 0) {
        givens.add(cellKey(row, col))
      }
    }
  }

  return givens
}

const normalizeMoves = (moves, label) => {
  assert(Array.isArray(moves), `${label} must be an array`)
  return moves.map((move, index) => {
    try {
      return cloneMove(assertValidMove({ ...move }))
    } catch (error) {
      throw new Error(`${label}[${index}] is invalid: ${error.message}`)
    }
  })
}

const normalizeSnapshotHistory = (history) => {
  assert(Array.isArray(history), 'Game history must be an array')
  assert(history.length > 0, 'Game history must not be empty')

  return history.map((snapshot, index) => {
    assert(snapshot && typeof snapshot === 'object', `Game history snapshot ${index} must be an object`)
    return new Sudoku(snapshot.grid).getGrid()
  })
}

const deriveMovesFromSnapshots = (snapshotGrids) => {
  const moves = []

  for (let i = 1; i < snapshotGrids.length; i += 1) {
    const prevGrid = snapshotGrids[i - 1]
    const nextGrid = snapshotGrids[i]
    let diff = null
    let diffCount = 0

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (prevGrid[row][col] !== nextGrid[row][col]) {
          diffCount += 1
          diff = { row, col, value: nextGrid[row][col] }
        }
      }
    }

    assert(diffCount === 1, 'Cannot reconstruct moves from snapshot history')
    moves.push(diff)
  }

  return moves
}

const assertMovesDoNotModifyGivens = (moves, givens, label) => {
  moves.forEach((move, index) => {
    assert(
      !givens.has(cellKey(move.row, move.col)),
      `${label}[${index}] modifies given cell at (${move.row},${move.col})`,
    )
  })
}

export class Game {
  /**
   * @param {Sudoku} sudoku
   */
  constructor(sudoku) {
    if (!(sudoku instanceof Sudoku)) {
      throw new Error('Game requires a Sudoku instance')
    }

    this._initialGrid = sudoku.getGrid()
    this._givens = deriveGivens(this._initialGrid)
    this._sudoku = sudoku.clone()
    this._moves = []
    this._currentIndex = 0
  }

  getSudoku() {
    return this._sudoku.clone()
  }

  getCurrentGrid() {
    return this._sudoku.getGrid()
  }

  isGiven(row, col) {
    return this._givens.has(cellKey(row, col))
  }

  getGivens() {
    return new Set(this._givens)
  }

  guess(move) {
    const nextMove = cloneMove(assertValidMove({ ...move }))

    if (this._givens.has(cellKey(nextMove.row, nextMove.col))) {
      throw new Error(`Cannot modify given cell at (${nextMove.row},${nextMove.col})`)
    }

    const nextSudoku = this._sudoku.clone()
    nextSudoku.guess(nextMove)

    if (this._currentIndex < this._moves.length) {
      this._moves = this._moves.slice(0, this._currentIndex)
    }

    this._moves.push(nextMove)
    this._currentIndex += 1
    this._sudoku = nextSudoku
  }

  undo() {
    if (!this.canUndo()) {
      return
    }

    this._currentIndex -= 1
    this._rebuildSudoku()
  }

  redo() {
    if (!this.canRedo()) {
      return
    }

    this._currentIndex += 1
    this._rebuildSudoku()
  }

  canUndo() {
    return this._currentIndex > 0
  }

  canRedo() {
    return this._currentIndex < this._moves.length
  }

  getHint(row, col, solver) {
    assertValidMove({ row, col, value: 0 })
    assert(typeof solver === 'function', 'Solver must be a function')

    if (this.isGiven(row, col)) {
      throw new Error(`Cannot hint given cell at (${row},${col})`)
    }

    const current = this._sudoku.getGrid()
    if (current[row][col] !== 0) {
      throw new Error(`Cannot hint filled cell at (${row},${col})`)
    }

    const solved = solver(current)
    assertValidGrid(solved, 'Solved Sudoku grid')

    const value = solved[row][col]
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      throw new Error(`Solver did not return a valid hint for (${row},${col})`)
    }

    return { row, col, value }
  }

  getState() {
    return {
      grid: this.getCurrentGrid(),
      givens: new Set(this._givens),
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      isComplete: this._sudoku.isComplete(),
      conflicts: this._sudoku.getConflicts(),
      isWon: this._sudoku.isSolved(),
    }
  }

  toJSON() {
    return {
      initialGrid: cloneGrid(this._initialGrid),
      moves: cloneMoves(this._moves.slice(0, this._currentIndex)),
      redoMoves: cloneMoves(this._moves.slice(this._currentIndex)),
    }
  }

  toString() {
    return [
      `Game(currentIndex=${this._currentIndex}, totalMoves=${this._moves.length})`,
      this._sudoku.toString(),
    ].join('\n')
  }

  _rebuildSudoku() {
    const sudoku = new Sudoku(this._initialGrid)

    for (let i = 0; i < this._currentIndex; i += 1) {
      sudoku.guess(this._moves[i])
    }

    this._sudoku = sudoku
  }

  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Game JSON must be an object')
    }

    if (Array.isArray(json.moves) || Array.isArray(json.redoMoves)) {
      const game = new Game(new Sudoku(json.initialGrid))
      const doneMoves = normalizeMoves(json.moves ?? [], 'Game moves')
      const redoMoves = normalizeMoves(json.redoMoves ?? [], 'Game redoMoves')
      assertMovesDoNotModifyGivens(doneMoves, game._givens, 'Game moves')
      assertMovesDoNotModifyGivens(redoMoves, game._givens, 'Game redoMoves')

      game._moves = doneMoves.concat(redoMoves)
      game._currentIndex = doneMoves.length
      game._rebuildSudoku()
      return game
    }

    if (Array.isArray(json.history)) {
      const snapshotGrids = normalizeSnapshotHistory(json.history)
      const currentIndex = json.currentIndex

      assert(Number.isInteger(currentIndex), 'Game currentIndex must be an integer')
      assert(currentIndex >= 0 && currentIndex < snapshotGrids.length, 'Game currentIndex is out of range')

      const game = new Game(new Sudoku(snapshotGrids[0]))
      game._moves = deriveMovesFromSnapshots(snapshotGrids)
      assertMovesDoNotModifyGivens(game._moves, game._givens, 'Game history')
      game._currentIndex = currentIndex
      game._rebuildSudoku()
      return game
    }

    return new Game(new Sudoku(json.sudoku?.grid))
  }
}
