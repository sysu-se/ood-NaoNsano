import {
  assertValidPuzzleGrid,
  assertValidGrid,
  assertValidMove,
  cloneGrid,
  findHiddenSingles,
  findNakedSingles,
  getCandidates,
  gridsEqual,
  hasConflicts,
  isGridComplete,
} from './grid.js'
import { Sudoku } from './sudoku.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const cloneMove = (move) => ({ row: move.row, col: move.col, value: move.value })
const cloneMoves = (moves) => moves.map(cloneMove)
const cellKey = (row, col) => `${row},${col}`
const cloneGridOrNull = (grid) => (grid ? cloneGrid(grid) : null)

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
    assertValidPuzzleGrid(this._initialGrid)
    this._givens = deriveGivens(this._initialGrid)
    this._sudoku = sudoku.clone()
    this._moves = []
    this._currentIndex = 0
    this._exploring = false
    this._checkpointGrid = null
    this._checkpointIndex = null
    this._exploreMoves = []
    this._exploreIndex = 0
    this._failedPaths = new Set()
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

    if (this._exploring) {
      if (this._exploreIndex < this._exploreMoves.length) {
        this._exploreMoves = this._exploreMoves.slice(0, this._exploreIndex)
      }

      this._exploreMoves.push(nextMove)
      this._exploreIndex += 1
      this._sudoku = nextSudoku
      return
    }

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

    if (this._exploring) {
      this._exploreIndex -= 1
      this._rebuildSudoku()
      return
    }

    this._currentIndex -= 1
    this._rebuildSudoku()
  }

  redo() {
    if (!this.canRedo()) {
      return
    }

    if (this._exploring) {
      this._exploreIndex += 1
      this._rebuildSudoku()
      return
    }

    this._currentIndex += 1
    this._rebuildSudoku()
  }

  canUndo() {
    if (this._exploring) {
      return this._exploreIndex > 0
    }

    return this._currentIndex > 0
  }

  canRedo() {
    if (this._exploring) {
      return this._exploreIndex < this._exploreMoves.length
    }

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

    assert(!hasConflicts(current), 'Cannot generate hint for a conflicting board')

    const solverInput = cloneGrid(current)
    const solved = solver(solverInput)
    assertValidGrid(solved, 'Solved Sudoku grid')
    assert(isGridComplete(solved), 'Solver must return a complete grid')
    assert(!hasConflicts(solved), 'Solver must return a conflict-free grid')

    for (let currentRow = 0; currentRow < 9; currentRow += 1) {
      for (let currentCol = 0; currentCol < 9; currentCol += 1) {
        if (current[currentRow][currentCol] !== 0) {
          assert(
            solved[currentRow][currentCol] === current[currentRow][currentCol],
            `Solver must preserve existing cell at (${currentRow},${currentCol})`,
          )
        }
      }
    }

    const value = solved[row][col]
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      throw new Error(`Solver did not return a valid hint for (${row},${col})`)
    }

    return { row, col, value }
  }

  getCellCandidates(row, col) {
    assertValidMove({ row, col, value: 0 })

    if (this.isGiven(row, col)) {
      return []
    }

    return getCandidates(this._sudoku.getGrid(), row, col)
  }

  getNextHint(level = 'answer') {
    assert(level === 'position' || level === 'answer', 'Hint level must be "position" or "answer"')

    const current = this._sudoku.getGrid()
    const nakedSingle = findNakedSingles(current)[0]
    if (nakedSingle) {
      return this._formatHint(nakedSingle, 'naked-single', level)
    }

    const hiddenSingle = findHiddenSingles(current)[0]
    if (hiddenSingle) {
      return this._formatHint(hiddenSingle, 'hidden-single', level)
    }

    return null
  }

  applyHint(hint) {
    assert(hint && typeof hint === 'object', 'Hint must be an object')
    assert(hint.level === 'answer', 'Only answer-level hints can be applied')
    assertValidMove({ row: hint.row, col: hint.col, value: hint.value })

    if (this.isGiven(hint.row, hint.col)) {
      throw new Error(`Cannot apply hint to given cell at (${hint.row},${hint.col})`)
    }

    const current = this._sudoku.getGrid()
    if (current[hint.row][hint.col] !== 0) {
      throw new Error(`Cannot apply hint to filled cell at (${hint.row},${hint.col})`)
    }

    const candidates = getCandidates(current, hint.row, hint.col)
    assert(candidates.includes(hint.value), 'Hint value is not a valid candidate for the current board')

    this.guess({ row: hint.row, col: hint.col, value: hint.value })
    return { ...hint }
  }

  applyNextHint() {
    const hint = this.getNextHint('answer')
    if (!hint) {
      return null
    }

    return this.applyHint(hint)
  }

  isExploring() {
    return this._exploring
  }

  canExplore() {
    return !this._exploring && !this._sudoku.isSolved() && this.getNextHint('answer') === null
  }

  startExplore() {
    if (this._exploring) {
      throw new Error('Exploration mode is already active')
    }

    if (this._sudoku.isSolved()) {
      throw new Error('Cannot explore a completed game')
    }

    if (!this.canExplore()) {
      throw new Error('Cannot explore while a deterministic hint is available')
    }

    this._exploring = true
    this._checkpointGrid = this._sudoku.getGrid()
    this._checkpointIndex = this._currentIndex
    this._exploreMoves = []
    this._exploreIndex = 0
  }

  commitExplore() {
    this._assertExploring()

    const current = this._sudoku.getGrid()
    assert(!hasConflicts(current), 'Cannot commit a conflicting exploration branch')
    assert(
      !this._failedPaths.has(this._fingerprint(current)),
      'Cannot commit a known failed exploration path',
    )

    const committedMoves = this._exploreMoves.slice(0, this._exploreIndex)
    this._moves = this._moves.slice(0, this._checkpointIndex).concat(cloneMoves(committedMoves))
    this._currentIndex = this._moves.length
    this._clearExploreState()
    this._rebuildSudoku()
  }

  abandonExplore() {
    this._assertExploring()

    this._currentIndex = this._checkpointIndex
    this._clearExploreState()
    this._rebuildSudoku()
  }

  backtrackExplore() {
    this._assertExploring()

    this._exploreMoves = []
    this._exploreIndex = 0
    this._sudoku = new Sudoku(this._checkpointGrid)
  }

  markExploreFailed() {
    this._assertExploring()
    this._failedPaths.add(this._fingerprint(this._sudoku.getGrid()))
  }

  isExploreFailed() {
    return this._exploring && hasConflicts(this._sudoku.getGrid())
  }

  isKnownFailedPath() {
    return this._exploring && this._failedPaths.has(this._fingerprint(this._sudoku.getGrid()))
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
      isExploring: this.isExploring(),
      canExplore: this.canExplore(),
      isExploreFailed: this.isExploreFailed(),
      isKnownFailedPath: this.isKnownFailedPath(),
      exploreMoveCount: this._exploreIndex,
    }
  }

  toJSON() {
    return {
      initialGrid: cloneGrid(this._initialGrid),
      moves: cloneMoves(this._moves.slice(0, this._currentIndex)),
      redoMoves: cloneMoves(this._moves.slice(this._currentIndex)),
      exploring: this._exploring,
      checkpointGrid: cloneGridOrNull(this._checkpointGrid),
      checkpointIndex: this._checkpointIndex,
      exploreMoves: cloneMoves(this._exploreMoves.slice(0, this._exploreIndex)),
      exploreRedoMoves: cloneMoves(this._exploreMoves.slice(this._exploreIndex)),
      failedPaths: Array.from(this._failedPaths),
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

    if (this._exploring) {
      for (let i = 0; i < this._exploreIndex; i += 1) {
        sudoku.guess(this._exploreMoves[i])
      }
    }

    this._sudoku = sudoku
  }

  _formatHint(hint, technique, level) {
    return {
      row: hint.row,
      col: hint.col,
      value: level === 'answer' ? hint.value : null,
      technique,
      reason: hint.reason,
      level,
    }
  }

  _assertExploring() {
    if (!this._exploring) {
      throw new Error('Exploration mode is not active')
    }
  }

  _clearExploreState() {
    this._exploring = false
    this._checkpointGrid = null
    this._checkpointIndex = null
    this._exploreMoves = []
    this._exploreIndex = 0
  }

  _fingerprint(grid) {
    assertValidGrid(grid)

    const cells = []
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const value = grid[row][col]
        if (value !== 0) {
          cells.push(`${row},${col}:${value}`)
        }
      }
    }

    return cells.join(';')
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
      game._failedPaths = new Set(Array.isArray(json.failedPaths) ? json.failedPaths.map(String) : [])

      if (json.exploring) {
        const exploreMoves = normalizeMoves(json.exploreMoves ?? [], 'Game exploreMoves')
        const exploreRedoMoves = normalizeMoves(json.exploreRedoMoves ?? [], 'Game exploreRedoMoves')
        assertMovesDoNotModifyGivens(exploreMoves, game._givens, 'Game exploreMoves')
        assertMovesDoNotModifyGivens(exploreRedoMoves, game._givens, 'Game exploreRedoMoves')
        assertValidGrid(json.checkpointGrid, 'Game checkpointGrid')
        assert(Number.isInteger(json.checkpointIndex), 'Game checkpointIndex must be an integer')
        assert(json.checkpointIndex >= 0 && json.checkpointIndex <= game._moves.length, 'Game checkpointIndex is out of range')

        game._exploring = true
        game._checkpointGrid = cloneGrid(json.checkpointGrid)
        game._checkpointIndex = json.checkpointIndex
        game._currentIndex = json.checkpointIndex
        game._exploreMoves = exploreMoves.concat(exploreRedoMoves)
        game._exploreIndex = exploreMoves.length

        const checkpointFromMoves = new Sudoku(game._initialGrid)
        for (let i = 0; i < game._checkpointIndex; i += 1) {
          checkpointFromMoves.guess(game._moves[i])
        }

        assert(
          gridsEqual(checkpointFromMoves.getGrid(), game._checkpointGrid),
          'Game checkpointGrid is inconsistent with moves',
        )
      }

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
