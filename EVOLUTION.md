# Homework 2 设计演进说明

## 1. 你如何实现提示功能？

提示分成两层：

- `src/domain/grid.js` 提供纯函数：`getCandidates`、`getAllCandidates`、`findNakedSingles`、`findHiddenSingles`。这些函数只根据网格计算候选数和确定性推断，不修改棋盘。
- `src/domain/game.js` 提供会话接口：`getCellCandidates`、`getNextHint(level)`、`applyHint(hint)`、`applyNextHint()`。查询提示保持无副作用，真正填数必须调用 `apply*` 方法。

UI 通过 `userGrid` store 调用领域接口。候选提示显示在 `hintDisplay` store 中，不覆盖用户自己输入的 pencil marks。

旧的 `getHint(row, col, solver)` 方法仍然保留，它依赖外部 solver 直接返回完整解，与新提示系统共存。两者的分工是：旧接口适用于接入第三方求解器（如 AI agent），新接口（`getNextHint` / `getCellCandidates`）由领域层自主计算，不依赖外部 solver。短期内两套接口并存，旧接口在未来可以作为"外部求解器适配器"的入口，内部统一委托给新系统。

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

进入探索模式有一个**重要前置条件**：`canExplore()` 要求 `getNextHint('answer') === null`，即当前棋盘不存在确定性推断。这意味着探索是"不得已的最后手段"——只有在逻辑推理无法继续时，才允许用户猜测。这避免了用户在明明有确定答案时误入猜测模式，也可以防止探索功能被滥用为跳过思考的工具。

失败检测采用双轨机制。`isExploreFailed()` 自动检测棋盘冲突（行/列/宫重复），对应需求中的"冲突判断"。但冲突不是探索失败的唯一形式——有时棋盘没有冲突，却走到了无候选数的逻辑死路。因此提供 `markExploreFailed()` 让用户手动标记当前局面为失败，`isKnownFailedPath()` 通过 `_failedPaths`（局面指纹集合）识别已标记的失败路径，对应需求中的"记忆"功能。

本实现的探索模式本质上是 **状态切换** 而非创建临时子会话。`Game` 通过 `this._exploring` 标志进入探索状态，此时 `guess()`、`undo()`、`redo()` 自动路由到 `_exploreMoves` 而非 `_moves`。这种方式比创建新的 `Game` 实例更轻量，不需要复制整个对象图，但也意味着探索逻辑与主逻辑耦合在同一个类中——这是有意为之的取舍，优先保证了 undo/redo 路由的透明性和 checkpoint 管理的一致性。

## 4. 主局面与探索局面的关系是什么？

主局面和探索局面不共享同一个可变数组。进入探索时保存当前 grid 的深拷贝作为 checkpoint，`Sudoku.getGrid()` 和 `cloneGrid()` 都返回新数组，避免外部引用污染。

提交时，将 checkpoint 之后的探索 move 追加到主 history；放弃和回溯时，用 checkpoint 重建当前 `Sudoku`。

`getState()` 是本次新增的统一状态查询接口，一次性返回 `{ grid, givens, canUndo, canRedo, isComplete, conflicts, isWon, isExploring, canExplore, isExploreFailed, isKnownFailedPath, exploreMoveCount }`。UI 层通过该接口获取完整快照，无需分别调用多个 getter，避免了多次调用之间的状态不一致问题，也降低了 UI 与 Game 内部结构的耦合。

## 5. history 结构是否发生变化？

主 history 仍然是 Homework 1 的线性数组 `_moves + _currentIndex`。新增的是探索模式内的线性 history：`_exploreMoves + _exploreIndex`。

探索中的 undo/redo 只作用于 `_exploreMoves`，不会改变主 history。这意味着探索模式拥有**独立的 Undo/Redo**：用户可以在探索分支内自由撤销和重做猜测，这些操作完全不影响主 history 的 `_moves` 和 `_currentIndex`。`undo()` 和 `redo()` 通过检查 `this._exploring` 自动路由到正确的 history——探索时操作 `_exploreIndex`，非探索时操作 `_currentIndex`，对调用方完全透明。

提交探索时，主 history 中 checkpoint 之后的 redo 分支会被截断，然后追加探索 move，整体仍保持线性栈，没有引入树状分支。

## 6. Homework 1 的哪些设计暴露出了局限？

Homework 1 的 `Game` 只有一条主历史线，适合普通落子、撤销和重做，但无法表达“临时尝试但尚未提交”的状态。原来的 hint 也只是 `getHint(row, col, solver)`，只能依赖外部 solver 给某格答案，不能表达候选提示、位置提示、推理原因和无副作用查询。

这次新增功能说明：`Game` 需要区分 query 和 command，也需要显式建模临时会话状态。

## 7. 如果重做 Homework 1，你会如何修改原设计？

我会从一开始把 `Game` 的接口分成查询方法和命令方法，例如 `getState()`、`getHint()` 是 query，`guess()`、`applyHint()` 是 command。同时会把 history 抽成更明确的内部结构，例如 `{ moves, index }`，这样主 history 和探索 history 可以复用同一套逻辑。

另外，我会更早把候选数、冲突检测、序列化这类规则函数集中在领域层，避免 UI store 未来为了新功能重新拼装领域逻辑。

## 实现速查表

- 提示功能可用
- 行为稳定
- 接口清晰

- 能进入探索
- 能提交探索结果
- 能放弃探索结果
- 主局面行为正确

- `Sudoku` / `Game` 关系清晰
- 新增状态或分支设计合理
- 设计未明显退化为“临时拼接”

- history 行为自洽
- 回滚 / 提交逻辑合理
- 无明显引用污染问题

- 命名清晰
- 结构清楚
- 可维护性较好

- 支持树状探索分支
- 支持探索过程中的独立 Undo / Redo
- 提示功能具有解释能力
- 为探索模式提供更优雅的状态建模
- 利用了AI Agent求解或解释

---

## 附录：课堂讨论准备

### 1. 为什么"提示"和"探索"会推动原有对象设计发生变化？

提示需要区分"查询"和"命令"——候选提示是纯查询不应产生副作用，而应用提示是命令需要经过历史系统。探索需要 `Game` 维护两套独立的状态和历史线。这两者分别推动 `Game` 从"单一状态机"演进为"多模式状态机"，暴露了 HW1 中 query 和 command 混在一起的接口设计问题。

### 2. 你的探索模式更接近"状态切换"还是"分支会话"？

更接近**状态切换**。本实现通过 `this._exploring` 标志位切换 `guess()`、`undo()`、`redo()` 的路由目标（`_moves` vs `_exploreMoves`），而不是创建新的 `Game` 实例或子会话。这种方式的优势是实现轻量、undo/redo 路由透明，代价是 `Game` 类职责较重。如果未来需要支持嵌套探索，"分支会话"（创建新的 `Game` 实例）会是更自然的扩展方向。

### 3. 你的 history 结构是否还能继续扩展？

当前 `_moves + _currentIndex` 和 `_exploreMoves + _exploreIndex` 的双线结构可以很自然地扩展为 `_branches: Map<branchId, { moves, index }>` ，从而支持多分支探索。但当前设计的一个约束是 `_failedPaths` 是全局 Set——如果未来有多分支，它需要改为 per-branch 的记录。另外，`_checkpointGrid` 和 `_checkpointIndex` 是单值字段，嵌套探索时会需要 checkpoint 栈。

### 4. 如果将来迁移到新的响应式机制，设计中哪些部分最容易迁移，哪些最难？

最容易迁移的是 `grid.js` 的纯函数层——它们是无副作用的数据变换，可以直接嵌入任何响应式框架的计算属性。`Sudoku` 作为不可变值对象（`getGrid()` 返回拷贝，`guess()` 返回新对象）也容易适配。

最难迁移的是 `Game` 类中的副作用式同步：`_rebuildSudoku()` 通过重放 moves 重建 `_sudoku`，依赖各方法手动维护 `_moves` / `_currentIndex` 与 `_sudoku` 的一致性。在响应式系统中，这种双重状态源需要改为单一数据源（如只保留 `_moves`，`_sudoku` 变为派生计算），但当前所有方法都直接读写 `_sudoku`，重构涉及面广。

### 5. 你的设计最脆弱的地方在哪里？

最脆弱的地方是面向对象，当前的两个主要对象承担了过多的责任，容易在未来开发造成过多耦合。