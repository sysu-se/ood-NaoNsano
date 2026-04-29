import { Game } from './game.js'
import { Sudoku } from './sudoku.js'

export function createSudoku(input) {
  return new Sudoku(input)
}

export function createSudokuFromJSON(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Sudoku JSON must be an object')
  }

  return new Sudoku(json.grid)
}

export function createGame({ sudoku }) {
  return new Game(sudoku)
}

export function createGameFromJSON(json) {
  return Game.fromJSON(json)
}