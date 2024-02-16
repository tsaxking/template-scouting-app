<script lang="ts">
import MatchSelector from '../components/MatchSelector.svelte'
import MatchTable from '../components/MatchTable.svelte';
import MenuButtons from '../components/MenuButtons.svelte'
import ScoutSelect from '../components/ScoutName.svelte';
</script>

<div>
    <MenuButtons />
    <ScoutSelect />
    <MatchSelector />
    <MatchTable />
</div>
