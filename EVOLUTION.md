# Homework 2 设计演进说明

## 1. 你如何实现提示功能？

提示分成两层：

- `src/domain/grid.js` 提供纯函数：`getCandidates`、`getAllCandidates`、`findNakedSingles`、`findHiddenSingles`。这些函数只根据网格计算候选数和确定性推断，不修改棋盘。
- `src/domain/game.js` 提供会话接口：`getCellCandidates`、`getNextHint(level)`、`applyHint(hint)`、`applyNextHint()`。查询提示保持无副作用，真正填数必须调用 `apply*` 方法。

UI 通过 `userGrid` store 调用领域接口。候选提示显示在 `hintDisplay` store 中，不覆盖用户自己输入的 pencil marks。

## 2. 提示功能更属于 Sudoku 还是 Game？为什么？

候选数计算更接近 `Sudoku`/网格规则，因为它只依赖当前 9x9 网格。实际接口更属于 `Game`，因为提示要考虑会话状态：给定格不能提示、已填格不能提示、位置提示不能泄露答案、答案提示需要通过历史系统落子。

所以本实现采用协作方式：`grid.js` 负责规则计算，`Game` 负责提示编排和命令边界。

## 3. 你如何实现探索模式？

探索模式是 `Game` 的一个临时状态。调用 `startExplore()` 时保存 checkpoint，包括当前网格和主历史位置；探索中的 `guess()` 不写入主 `_moves`，而是写入独立的 `_exploreMoves`。

探索模式提供：

- `commitExplore()`：把当前探索分支合并进主历史。
- `abandonExplore()`：回到 checkpoint 并退出探索。
- `backtrackExplore()`：回到 checkpoint，但继续留在探索模式。
- `markExploreFailed()` / `isKnownFailedPath()`：记录并识别失败局面。
- `isExploreFailed()`：用冲突检测判断当前探索是否失败。

## 4. 主局面与探索局面的关系是什么？

主局面和探索局面不共享同一个可变数组。进入探索时保存当前 grid 的深拷贝作为 checkpoint，`Sudoku.getGrid()` 和 `cloneGrid()` 都返回新数组，避免外部引用污染。

提交时，将 checkpoint 之后的探索 move 追加到主 history；放弃和回溯时，用 checkpoint 重建当前 `Sudoku`。

## 5. history 结构是否发生变化？

主 history 仍然是 Homework 1 的线性数组 `_moves + _currentIndex`。新增的是探索模式内的线性 history：`_exploreMoves + _exploreIndex`。

探索中的 undo/redo 只作用于 `_exploreMoves`，不会改变主 history。提交探索时会截断主 history 中 checkpoint 之后的 redo 分支，再追加探索 move，因此整体仍保持线性栈，没有引入树状分支。

## 6. Homework 1 的哪些设计暴露出了局限？

Homework 1 的 `Game` 只有一条主历史线，适合普通落子、撤销和重做，但无法表达“临时尝试但尚未提交”的状态。原来的 hint 也只是 `getHint(row, col, solver)`，只能依赖外部 solver 给某格答案，不能表达候选提示、位置提示、推理原因和无副作用查询。

这次新增功能说明：`Game` 需要区分 query 和 command，也需要显式建模临时会话状态。

## 7. 如果重做 Homework 1，你会如何修改原设计？

我会从一开始把 `Game` 的接口分成查询方法和命令方法，例如 `getState()`、`getHint()` 是 query，`guess()`、`applyHint()` 是 command。同时会把 history 抽成更明确的内部结构，例如 `{ moves, index }`，这样主 history 和探索 history 可以复用同一套逻辑。

另外，我会更早把候选数、冲突检测、序列化这类规则函数集中在领域层，避免 UI store 未来为了新功能重新拼装领域逻辑。
