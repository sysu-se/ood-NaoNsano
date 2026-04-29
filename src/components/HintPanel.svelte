<script>
	import { hintDisplay } from '@sudoku/stores/hintDisplay';
</script>

{#if $hintDisplay.show}
	<section class="hint-panel" aria-live="polite">
		<div>
			<p class="hint-title">{$hintDisplay.technique}</p>
			<p class="hint-text">{$hintDisplay.reasoning}</p>
		</div>

		<button class="hint-close" on:click={hintDisplay.clear} title="Close hint">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</section>
{/if}

<style>
	.hint-panel {
		@apply max-w-xl mx-auto mb-4 px-4 py-3 rounded-lg bg-secondary text-primary-darker flex items-start justify-between gap-3;
	}

	.hint-title {
		@apply text-sm font-semibold;
	}

	.hint-text {
		@apply text-sm leading-snug;
	}

	.hint-close {
		@apply flex-shrink-0 h-8 w-8 rounded-full text-primary-darker;
	}
</style>
