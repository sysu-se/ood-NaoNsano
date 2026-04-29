/**
 * @typedef {Object} Move
 * @property {number} row
 * @property {number} col
 * @property {number} value
 */

/**
 * @typedef {number[][]} Grid
 */

/**
 * @typedef {Object} SudokuJSON
 * @property {Grid} grid
 */

/**
 * @typedef {Object} GameJSON
 * @property {Grid} initialGrid
 * @property {Move[]} moves
 * @property {Move[]} redoMoves
 */