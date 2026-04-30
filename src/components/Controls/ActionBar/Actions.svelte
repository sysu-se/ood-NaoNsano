<script>
	import { candidates } from '@sudoku/stores/candidates';
	import { redoMove, undoMove } from '@sudoku/game';
	import { gameState, userGrid } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';

	const { canUndo, canRedo } = userGrid;
	let hintMode = 'answer';

	$: hintsAvailable = $hints > 0;
	$: selectedEmpty = $cursor.x !== null && $cursor.y !== null && $userGrid[$cursor.y][$cursor.x] === 0;

	function handleHint() {
		if (hintMode === 'candidates') {
			userGrid.applyCandidateHint($cursor);
			return;
		}

		if (hintMode === 'position') {
			userGrid.applyPositionHint();
			return;
		}

		if (hintsAvailable) {
			if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
				candidates.clear($cursor);
			}

			userGrid.applyAnswerHint();
		}
	}
</script>

<div class="action-buttons space-x-3">

	<button class="btn btn-round" disabled={$gamePaused || !$canUndo} on:click={undoMove} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused || !$canRedo} on:click={redoMove} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<select class="hint-select" bind:value={hintMode} disabled={$gamePaused || $keyboardDisabled} title="Hint level">
		<option value="candidates">Candidates</option>
		<option value="position">Position</option>
		<option value="answer">Answer</option>
	</select>

	<button class="btn btn-round btn-badge"
	        disabled={$gamePaused || $keyboardDisabled || (hintMode === 'answer' && !hintsAvailable) || (hintMode === 'candidates' && !selectedEmpty)}
	        on:click={handleHint}
	        title="Hints ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	{#if $gameState && $gameState.canExplore}
		<button class="btn btn-round" disabled={$gamePaused || $keyboardDisabled} on:click={userGrid.startExplore} title="Explore">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a7 7 0 00-7 7v2a3 3 0 003 3h1v-4H6v-1a5 5 0 1110 3.75V16h1a3 3 0 003-3v-2a7 7 0 00-7-7h-2zM9 20h6" />
			</svg>
		</button>
	{/if}

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

</div>


<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}

	.hint-select {
		@apply h-12 px-2 rounded-lg border border-gray-300 bg-white text-sm;
	}
</style>
