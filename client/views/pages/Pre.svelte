<script lang="ts">
import MatchSelector from '../components/MatchSelector.svelte'
import MenuButtons from '../components/MenuButtons.svelte'
import ScoutSelect from '../components/ScoutName.svelte';

import { createEventDispatcher } from 'svelte';

const d = createEventDispatcher();
</script>

<div>
    <MenuButtons />
    <ScoutSelect />
    <MatchSelector on:play={() => d('play')} />
</div>
