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
 * @property {boolean} [exploring]
 * @property {Grid|null} [checkpointGrid]
 * @property {number|null} [checkpointIndex]
 * @property {Move[]} [exploreMoves]
 * @property {Move[]} [exploreRedoMoves]
 * @property {string[]} [failedPaths]
 */

/**
 * @typedef {Object} HintResult
 * @property {number} row
 * @property {number} col
 * @property {number|null} value
 * @property {'naked-single'|'hidden-single'} technique
 * @property {string} reason
 * @property {'position'|'answer'} level
 */
