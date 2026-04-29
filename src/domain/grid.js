const GRID_SIZE = 9
const BOX_SIZE = 3
const EMPTY_CELL = 0

const range = (size) => Array.from({ length: size }, (_, index) => index)

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const isIntegerBetween = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max

const cloneRow = (row) => row.slice()

export const cloneGrid = (grid) => grid.map(cloneRow)

export const assertValidGrid = (grid, label = 'Sudoku grid') => {
  assert(Array.isArray(grid), `${label} must be a 9x9 array`)
  assert(grid.length === GRID_SIZE, `${label} must contain 9 rows`)

  grid.forEach((row, rowIndex) => {
    assert(Array.isArray(row), `${label} row ${rowIndex} must be an array`)
    assert(row.length === GRID_SIZE, `${label} row ${rowIndex} must contain 9 cells`)

    row.forEach((cell, colIndex) => {
      assert(
        isIntegerBetween(cell, 0, 9),
        `${label} cell [${rowIndex}, ${colIndex}] must be an integer between 0 and 9`,
      )
    })
  })

  return grid
}

export const assertValidMove = (move) => {
  assert(move && typeof move === 'object', 'Move must be an object')
  assert(isIntegerBetween(move.row, 0, 8), 'Move row must be an integer between 0 and 8')
  assert(isIntegerBetween(move.col, 0, 8), 'Move col must be an integer between 0 and 8')
  assert(isIntegerBetween(move.value, 0, 9), 'Move value must be an integer between 0 and 9')
  return move
}

export const withCellValue = (grid, { row, col, value }) =>
  grid.map((line, rowIndex) =>
    rowIndex === row
      ? line.map((cell, colIndex) => (colIndex === col ? value : cell))
      : cloneRow(line),
  )

export const formatGrid = (grid) => {
  const top = '+-------+-------+-------+'
  const middle = '|-------+-------+-------|'

  const body = range(GRID_SIZE).flatMap((rowIndex) => {
    const row = grid[rowIndex]
    const segments = range(BOX_SIZE)
      .map((segmentIndex) =>
        row
          .slice(segmentIndex * BOX_SIZE, (segmentIndex + 1) * BOX_SIZE)
          .map((cell) => (cell === EMPTY_CELL ? '.' : String(cell)))
          .join(' '),
      )
      .join(' | ')

    const line = `| ${segments} |`
    return rowIndex > 0 && rowIndex % BOX_SIZE === 0 ? [middle, line] : [line]
  })

  return [top, ...body, top].join('\n')
}

export const GRID_CONSTANTS = {
  BOX_SIZE,
  EMPTY_CELL,
  GRID_SIZE,
}

const assertValidCell = (row, col) => {
  assert(isIntegerBetween(row, 0, 8), 'Cell row must be an integer between 0 and 8')
  assert(isIntegerBetween(col, 0, 8), 'Cell col must be an integer between 0 and 8')
}

const boxStart = (index) => Math.floor(index / BOX_SIZE) * BOX_SIZE

const getRowCells = (row) => range(GRID_SIZE).map((col) => ({ row, col }))
const getColCells = (col) => range(GRID_SIZE).map((row) => ({ row, col }))
const getBoxCells = (boxRow, boxCol) => {
  const cells = []
  const startRow = boxStart(boxRow)
  const startCol = boxStart(boxCol)

  for (let row = startRow; row < startRow + BOX_SIZE; row += 1) {
    for (let col = startCol; col < startCol + BOX_SIZE; col += 1) {
      cells.push({ row, col })
    }
  }

  return cells
}

const unitName = (type, index) => {
  if (type === 'row') return `row ${index + 1}`
  if (type === 'col') return `column ${index + 1}`
  return `box ${index + 1}`
}

const cellName = (row, col) => `(${row + 1},${col + 1})`

export const getCandidates = (grid, row, col) => {
  assertValidGrid(grid)
  assertValidCell(row, col)

  if (grid[row][col] !== EMPTY_CELL) {
    return []
  }

  const used = new Set()

  getRowCells(row).forEach(({ col: cellCol }) => {
    if (grid[row][cellCol] !== EMPTY_CELL) used.add(grid[row][cellCol])
  })

  getColCells(col).forEach(({ row: cellRow }) => {
    if (grid[cellRow][col] !== EMPTY_CELL) used.add(grid[cellRow][col])
  })

  getBoxCells(row, col).forEach(({ row: cellRow, col: cellCol }) => {
    if (grid[cellRow][cellCol] !== EMPTY_CELL) used.add(grid[cellRow][cellCol])
  })

  return range(GRID_SIZE)
    .map((index) => index + 1)
    .filter((value) => !used.has(value))
}

export const getAllCandidates = (grid) => {
  assertValidGrid(grid)

  const candidates = new Map()

  range(GRID_SIZE).forEach((row) => {
    range(GRID_SIZE).forEach((col) => {
      if (grid[row][col] === EMPTY_CELL) {
        candidates.set(`${row},${col}`, getCandidates(grid, row, col))
      }
    })
  })

  return candidates
}

export const findNakedSingles = (grid) => {
  const allCandidates = getAllCandidates(grid)
  const singles = []

  allCandidates.forEach((candidates, key) => {
    if (candidates.length !== 1) {
      return
    }

    const [row, col] = key.split(',').map(Number)
    const value = candidates[0]
    singles.push({
      row,
      col,
      value,
      reason: `Cell ${cellName(row, col)} must be ${value} because it is the only possible value after eliminating numbers already present in row ${row + 1}, column ${col + 1}, and its 3x3 box.`,
    })
  })

  return singles
}

export const findHiddenSingles = (grid) => {
  assertValidGrid(grid)

  const allCandidates = getAllCandidates(grid)
  const singlesByCellValue = new Map()

  const addHiddenSingle = (type, index, cells) => {
    range(GRID_SIZE).forEach((valueIndex) => {
      const value = valueIndex + 1
      const possibleCells = cells.filter(({ row, col }) =>
        allCandidates.get(`${row},${col}`)?.includes(value),
      )

      if (possibleCells.length !== 1) {
        return
      }

      const [{ row, col }] = possibleCells
      const key = `${row},${col}:${value}`
      if (singlesByCellValue.has(key)) {
        return
      }

      singlesByCellValue.set(key, {
        row,
        col,
        value,
        reason: `In ${unitName(type, index)}, value ${value} can only go in cell ${cellName(row, col)} because all other empty cells in that unit cannot contain ${value}.`,
      })
    })
  }

  range(GRID_SIZE).forEach((row) => {
    addHiddenSingle('row', row, getRowCells(row))
  })

  range(GRID_SIZE).forEach((col) => {
    addHiddenSingle('col', col, getColCells(col))
  })

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += BOX_SIZE) {
      const boxIndex = Math.floor(boxRow / BOX_SIZE) * BOX_SIZE + Math.floor(boxCol / BOX_SIZE)
      addHiddenSingle('box', boxIndex, getBoxCells(boxRow, boxCol))
    }
  }

  return Array.from(singlesByCellValue.values())
}

export const isGridComplete = (grid) => {
  assertValidGrid(grid)

  return grid.every((row) => row.every((cell) => cell !== EMPTY_CELL))
}

export const getConflictingCells = (grid) => {
  assertValidGrid(grid)

  const conflicts = new Set()

  const addConflict = (row, col) => {
    conflicts.add(`${row},${col}`)
  }

  const checkGroup = (cells) => {
    const seen = new Map()

    cells.forEach(({ row, col }) => {
      const value = grid[row][col]
      if (value === EMPTY_CELL) {
        return
      }

      const previousCells = seen.get(value) ?? []
      previousCells.forEach((previous) => {
        addConflict(previous.row, previous.col)
        addConflict(row, col)
      })
      previousCells.push({ row, col })
      seen.set(value, previousCells)
    })
  }

  range(GRID_SIZE).forEach((row) => {
    checkGroup(range(GRID_SIZE).map((col) => ({ row, col })))
  })

  range(GRID_SIZE).forEach((col) => {
    checkGroup(range(GRID_SIZE).map((row) => ({ row, col })))
  })

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += BOX_SIZE) {
      const cells = []

      for (let row = boxRow; row < boxRow + BOX_SIZE; row += 1) {
        for (let col = boxCol; col < boxCol + BOX_SIZE; col += 1) {
          cells.push({ row, col })
        }
      }

      checkGroup(cells)
    }
  }

  return Array.from(conflicts, (key) => {
    const [row, col] = key.split(',').map(Number)
    return { row, col }
  })
}

export const hasConflicts = (grid) => getConflictingCells(grid).length > 0
