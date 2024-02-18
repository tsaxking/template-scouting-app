<script lang='ts'>
    import { App } from '../../models/app/app';
    import { createEventDispatcher } from 'svelte';
    import MatchTable from './MatchTable.svelte';
import type { TBAMatch } from '../../../shared/submodules/tatorscout-calculations/tba';

    const d = createEventDispatcher();

    export let app: App;

    let matches: TBAMatch[] = [];

    const fns = {
        next: async () => {
            const r = await App.moveMatchIndex(1);
            d('next');
        },
        prev: async () => {
            const r = await App.moveMatchIndex(-1);
            d('prev');
        },
        play: () => {
            d('play');
        }
    }
</script>



<div class="btn-group w-100" role="group">
    <button type="button" class="btn btn-danger" on:click = {fns.prev}>
        <i class="material-icons">chevron_left</i>
        Previous Match
    </button>
    <button type="button" class="btn btn-success" on:click = {fns.play}>
        Play Match
        <i class="material-icons">play_arrow</i>
    </button>
    <button type="button" class="btn btn-primary" on:click = {fns.next}>
        Next Match
        <i class="material-icons">chevron_right</i>
    </button>
</div>
<MatchTable {app}/>