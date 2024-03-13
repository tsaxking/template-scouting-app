<script lang="ts">
import { createEventDispatcher } from 'svelte';
import { App } from '../../models/app/app';
import SelectedInfo from './SelectedInfo.svelte';
import { type TBAEvent } from '../../../shared/submodules/tatorscout-calculations/tba';

export let compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f' = 'qm';
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
    const eventData = await App.getEventData(eventKey);
    if (eventData.isErr()) return console.error(eventData.error);

    teams = eventData.value.teams.map(t => ({
        number: t.team_number,
        name: t.nickname
    }));

    matchNum = eventKey === eventData.value.eventKey ? String(App.matchData.matchNumber) : '';
    teamNum = eventKey === eventData.value.eventKey ? App.matchData.teamNumber : 0;

    App.selectMatch(1, 'qm');
};

$: onEventSelect(event);
</script>

<SelectedInfo />

{#if !!events.length}
    <!-- prescouting checkbox -->
    <div class="form-check form-switch mb-3">
        <input
            class="form-check-input"
            type="checkbox"
            id="PreScoutingCheck"
            bind:checked="{App.preScouting}"
        />
        <label class="form-check-label" for="PreScoutingCheck">
            Pre-scouting
        </label>
    </div>

    <div class="form-floating mb-3">
        <select
            class="form-select"
            aria-label="Select Event"
            id="EventSelect"
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
        class="form-select"
        aria-label="Select Match"
        id="CompLevelSelect"
        bind:value="{compLevel}"
    >
        <option value="pr">Practice match</option>
        <option value="qm" selected>Qualifying match</option>
        <option value="qf">Quarter finals</option>
        <option value="sf">Semi finals</option>
        <option value="f">Finals!</option>
    </select>
    <label for="CompLevelSelect">Select match type</label>
</div>

<div class="form-floating mb-3">
    <input
        type="number"
        class="form-control"
        id="MatchNumberInput"
        placeholder="Match number"
        bind:value="{matchNum}"
    />
    <label for="MatchNumberInput">Match number</label>
</div>

<div class="form-floating mb-3">
    <select
        class="form-select"
        aria-label="Select Team"
        id="TeamNumberSelect"
        bind:value="{teamNum}"
    >
        {#each teams as team}
            <option value="{team.number}">{team.number} | {team.name}</option>
        {/each}
    </select>
    <label for="TeamNumberSelect">Select team</label>
</div>
