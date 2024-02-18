<script lang="ts">
import { App } from '../../models/app/app';
import MatchSelector from '../components/MatchSelector.svelte'
import MatchTable from '../components/MatchTable.svelte';
import MenuButtons from '../components/MenuButtons.svelte'
import ScoutSelect from '../components/ScoutName.svelte';

export let app: App;
</script>

<div>
    <MenuButtons />
    <ScoutSelect />
    <MatchSelector />
    <MatchTable {app} />
</div>
