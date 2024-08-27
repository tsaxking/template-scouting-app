<script lang="ts">
  import { App } from '../../models/app/app';
  import { createEventDispatcher } from 'svelte';

  let teams: number[] = [];
  export let group: number = -1;

  const d = createEventDispatcher();

  const fns = {
    getTeams: async (g: number) => {
      const data = await App.getEventData();
      if (data.isErr()) return console.error(data.error);

      teams = data.value.assignments.groups[g] || [];
    },
    switchGroup: async (g: number) => {
      await App.matchData.selectGroup(g);
      group = g;
      d('group', g);
    }
  };

  $: fns.getTeams(group);
</script>

<div class="form-floating">
  <select
    id="floatingSelect"
    class="form-select"
    bind:value="{group}"
    on:change="{() => fns.switchGroup(group)}"
  >
    <option value="-1">Select a group</option>
    {#each Array.from({ length: 6 }, (_, i) => i) as g}
      <option value="{g}">{g + 1}</option>
    {/each}
  </select>
  <label for="floatingSelect">Select a group</label>
</div>

<ul class="list-group">
  {#each teams as assignedTeam}
    <li class="list-group-item">
      {assignedTeam}
    </li>
  {/each}
</ul>
