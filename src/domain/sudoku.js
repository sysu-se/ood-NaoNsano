import {
  assertValidGrid,
  assertValidMove,
  cloneGrid,
  formatGrid,
  getConflictingCells,
  isGridComplete,
  withCellValue,
} from './grid.js'

export class Sudoku {
  /**
   * @param {number[][]} grid
   */
  constructor(grid) {
    assertValidGrid(grid)
    this._grid = cloneGrid(grid)
  }

  getGrid() {
    return cloneGrid(this._grid)
  }

  /**
   * @param {{ row: number, col: number, value: number }} move
   */
  guess(move) {
    assertValidMove(move)
    this._grid = withCellValue(this._grid, move)
  }

  getConflicts() {
    return getConflictingCells(this._grid)
  }

  isComplete() {
    return isGridComplete(this._grid)
  }

  isSolved() {
    return this.isComplete() && this.getConflicts().length === 0
  }

  clone() {
    return new Sudoku(this._grid)
  }

  toJSON() {
    return {
      grid: this.getGrid(),
    }
  }

  toString() {
    return formatGrid(this._grid)
  }
}
