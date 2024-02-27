<script lang="ts">
import { App } from '../../models/app/app';
import MatchSelector from '../components/MatchSelector.svelte'
import MenuButtons from '../components/MenuButtons.svelte'
import ScoutSelect from '../components/ScoutName.svelte';
import MatchTable from '../components/MatchTable.svelte';

export let app: App;
import { createEventDispatcher } from 'svelte';

const d = createEventDispatcher();
</script>

<div>
    <MenuButtons />
    <ScoutSelect />
    <MatchSelector on:play={() => d('play')} {app} on:change={() => d('change')} />
</div>
