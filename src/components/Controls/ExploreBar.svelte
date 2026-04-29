<script>
	import { gamePaused } from '@sudoku/stores/game';
	import { gameState, userGrid } from '@sudoku/stores/grid';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
</script>

{#if $gameState && $gameState.isExploring}
	<div class="explore-bar">
		<div class="explore-status">
			<span>Explore</span>
			<span>{$gameState.exploreMoveCount} moves</span>
		</div>

		<div class="explore-actions">
			<button class="btn explore-btn" disabled={$gamePaused || $keyboardDisabled} on:click={userGrid.commitExplore}>
				Commit
			</button>
			<button class="btn explore-btn" disabled={$gamePaused || $keyboardDisabled} on:click={userGrid.backtrackExplore}>
				Backtrack
			</button>
			<button class="btn explore-btn" disabled={$gamePaused || $keyboardDisabled} on:click={userGrid.markExploreFailed}>
				Mark Failed
			</button>
			<button class="btn explore-btn" disabled={$gamePaused || $keyboardDisabled} on:click={userGrid.abandonExplore}>
				Abandon
			</button>
		</div>

		{#if $gameState.isExploreFailed}
			<p class="explore-warning">This branch has conflicts.</p>
		{:else if $gameState.isKnownFailedPath}
			<p class="explore-warning">This path was previously marked failed.</p>
		{/if}
	</div>
{/if}

<style>
	.explore-bar {
		@apply mb-4 p-3 rounded-lg bg-secondary text-primary-darker;
	}

	.explore-status {
		@apply flex justify-between text-sm font-semibold mb-2;
	}

	.explore-actions {
		@apply grid grid-cols-2 gap-2;
	}

	.explore-btn {
		@apply py-2 px-2 text-sm;
	}

	.explore-warning {
		@apply mt-2 text-sm font-semibold text-red-600;
	}
</style>
