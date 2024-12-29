<script lang="ts">
    import { App } from '../../models/app/app';
    import { createEventDispatcher } from 'svelte';
    import MatchTable from './MatchTable.svelte';
    import type { TBAMatch } from '../../../shared/submodules/tatorscout-calculations/tba';

    const d = createEventDispatcher();

    export let app: App;

    const fns = {
        next: async () => {
            App.matchData.next();
            d('next');
            d('change');
        },
        prev: async () => {
            App.matchData.prev();
            d('prev');
            d('change');
        },
        play: () => {
            d('play');
        }
    };
</script>

<div
    class="btn-group w-100 btn-group-lg p-0"
    role="group">
    <button
        class="btn btn-outline-danger"
        type="button"
        on:click="{fns.prev}">
        <i class="material-icons">chevron_left</i>
        Previous Match
    </button>
    <button
        class="btn btn-success"
        type="button"
        on:click="{fns.play}">
        Play Match
        <i class="material-icons">play_arrow</i>
    </button>
    <button
        class="btn btn-outline-primary"
        type="button"
        on:click="{fns.next}">
        Next Match
        <i class="material-icons">chevron_right</i>
    </button>
</div>
<MatchTable {app} />
