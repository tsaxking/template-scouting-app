<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { App } from '../../models/app/app';
  import SelectedInfo from './SelectedInfo.svelte';
  import { type TBAEvent } from '../../../shared/submodules/tatorscout-calculations/tba';

  export let compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f' = App.matchData.compLevel;
  export let matchNum: string = String(App.matchData.matchNumber || '');
  export let teamNum: number = App.matchData.teamNumber;
  export let teams: {
    number: number;
    name: string;
  }[] = [];
  export let events: TBAEvent[] = [];
  export let event: string = '';

  const d = createEventDispatcher();

  $: d('compLevel', compLevel);
  $: d('matchNum', matchNum);
  $: d('teamNum', teamNum);

  const onEventSelect = async (eventKey: string) => {
    const [current, newData] = await Promise.all([
      App.getEventData(),
      App.getEventData(eventKey)
    ]);
    if (current.isErr()) return console.error(current.error);
    if (newData.isErr()) return console.error(newData.error);

    if (current.value.eventKey === newData.value.eventKey) return;

    teams = newData.value.teams.map(t => ({
      number: t.team_number,
      name: t.nickname
    }));

    matchNum =
      eventKey === newData.value.eventKey
        ? String(App.matchData.matchNumber)
        : '';
    teamNum =
      eventKey === newData.value.eventKey ? App.matchData.teamNumber : 0;

    App.matchData.selectMatch(1, 'qm');
  };

  $: onEventSelect(event);
</script>

<SelectedInfo />

{#if !!events.length}
  <!-- prescouting checkbox -->
  <div class="form-check form-switch mb-3">
    <input
      id="PreScoutingCheck"
      class="form-check-input"
      type="checkbox"
      bind:checked="{App.preScouting}"
    />
    <label
      class="form-check-label"
      for="PreScoutingCheck">
      Pre-scouting
    </label>
  </div>

  <div class="form-floating mb-3">
    <select
      id="EventSelect"
      class="form-select"
      aria-label="Select Event"
      bind:value="{event}"
    >
      {#each events as e}
        <option value="{e.key}">{e.name}</option>
      {/each}
    </select>
    <label for="EventSelect">Select event</label>
  </div>
{/if}

<div class="form-floating mb-3">
  <select
    id="CompLevelSelect"
    class="form-select"
    aria-label="Select Match"
    bind:value="{compLevel}"
  >
    <option value="pr">Practice match</option>
    <option
      selected
      value="qm">Qualifying match</option>
    <option value="qf">Quarter finals</option>
    <option value="sf">Semi finals</option>
    <option value="f">Finals!</option>
  </select>
  <label for="CompLevelSelect">Select match type</label>
</div>

<div class="form-floating mb-3">
  <input
    id="MatchNumberInput"
    class="form-control"
    placeholder="Match number"
    type="number"
    bind:value="{matchNum}"
  />
  <label for="MatchNumberInput">Match number</label>
</div>

<div class="form-floating mb-3">
  <select
    id="TeamNumberSelect"
    class="form-select"
    aria-label="Select Team"
    bind:value="{teamNum}"
  >
    {#each teams as team}
      <option value="{team.number}">{team.number} | {team.name}</option>
    {/each}
  </select>
  <label for="TeamNumberSelect">Select team</label>
</div>
