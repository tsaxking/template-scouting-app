<script lang="ts">
  import { App } from '../../models/app/app';
  import MatchSelector from '../components/MatchSelector.svelte';
  import MenuButtons from '../components/MenuButtons.svelte';
  import ScoutSelect from '../components/ScoutName.svelte';
  import MatchTable from '../components/MatchTable.svelte';
  import SelectedInfo from '../components/SelectedInfo.svelte';

  export let app: App;
  import { createEventDispatcher } from 'svelte';

  const d = createEventDispatcher();
</script>

<div class="container-fluid">
  <div class="row">
    <MenuButtons />
  </div>
  <div class="row">
    <ScoutSelect />
  </div>
  <div class="row">
    <MatchSelector
      {app}
      on:play="{() => d('play')}"
      on:change="{() => d('change')}"
    />
  </div>
</div>
