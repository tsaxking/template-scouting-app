<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f' = 'qm';
    export let matchNum: number;
    export let teamNum: number;
    export let teams: {
        number: number;
        name: string;
    }[] = [];

    const d = createEventDispatcher();

    $: d('compLevel', compLevel);
    $: d('matchNum', matchNum);
    $: d('teamNum', teamNum);
</script>


<div class="form-floating mb-3">
    <select class="form-select" aria-label="Select Match" id="CompLevelSelect" bind:value={compLevel}>
        <option value="pr">Practice match</option>
        <option value="qm" selected>Qualifying match</option>
        <option value="qf">Quarter finals</option>
        <option value="sf">Semi finals</option>
        <option value="f">Finals!</option>
    </select>
    <label for="CompLevelSelect">Select match type</label>
</div>

<div class="form-floating mb-3">
    <input type="number" class="form-control" id="MatchNumberInput" placeholder="Match number" bind:value={matchNum}>
    <label for="MatchNumberInput">Match number</label>
</div>

<div class="form-floating mb-3">
    <select class="form-select" aria-label="Select Team" id="TeamNumberSelect" bind:value={teamNum}>
        {#each teams as team}
            <option value={team.number}>{team.name}</option>
        {/each}
    </select>
</div>