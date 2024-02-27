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
            await App.moveMatchIndex(1);
            d('next');
            d('change');
        },
        prev: async () => {
            await App.moveMatchIndex(-1);
            d('prev');
            d('change');
        },
        play: () => {
            d('play');
        }
    }
</script>



<div class="btn-group w-100 btn-group-lg" role="group">
    <button type="button" class="btn btn-outline-danger" on:click = {fns.prev}>
        <i class="material-icons">chevron_left</i>
        Previous Match
    </button>
    <button type="button" class="btn btn-success" on:click = {fns.play}>
        Play Match
        <i class="material-icons">play_arrow</i>
    </button>
    <button type="button" class="btn btn-outline-primary" on:click = {fns.next}>
        Next Match
        <i class="material-icons">chevron_right</i>
    </button>
</div>
<MatchTable {app}/>