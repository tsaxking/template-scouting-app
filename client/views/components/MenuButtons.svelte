<script lang='ts'>
    import {App} from './../../models/app/app';
    import { createEventDispatcher } from 'svelte';
    import Modal from './bootstrap/Modal.svelte';
    export let app: App;
    const idInfo: string = 'custom-info-modal';
    const idTeams: string = 'assigned-teams';
    const idTuto: string = 'tutorial-modal';
    const idFlip: string = 'flip-orientation';
    let matchNum: number;
    let teamNum: number;
    let matchType: string;

    async function getAssignedTeams(groupNum){
        const data = await App.getEventData()
        if(data.isOk()){
            teams = data.value.assignments.groups[groupNum];
        }    
    };
    getAssignedTeams(0);
    let teams: number[] = [];


    const updateData = () => {
        if(typeof matchType == 'string') {
            app.matchData.compLevel = matchType as 'pr' | 'qm' | 'qf' | 'sf' | 'f';            
        }

        if(typeof matchNum == 'number') {
            app.matchData.number = matchNum;
        }

        if(typeof teamNum == 'number') {
            app.matchData.teamNumber = teamNum;
        }
        console.log(matchNum + ' ' + teamNum + ' ' + matchType);
    }
</script>

<div class="btn-group w-100" role="group">
    <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#{idInfo}">
        Enter Custom Match Info
    </button>
    <button type="button" class="btn btn-warning" data-toggle="modal" data-target="#{idTuto}">
        Tutorial
    </button>
    <button type="button" class="btn btn-info" data-toggle="modal" data-target="#{idTeams}">
        Your Assigned Teams
    </button>
    <button type="button" class="btn btn-success" data-toggle="modal" data-target='#{idFlip}'>
        Flip Field Orientation
    </button>
</div>

<Modal title="Enter Custom Match Info" id={idInfo}>
    <select class="form-select" aria-label="Default select example" bind:value={matchType}>
        <option selected>Select level of competition</option>
        <option value="pr">Practice match</option>
        <option value="qm">Qualifying match</option>
        <option value="qf">Quarter finals</option>
        <option value="sf">Semi finals</option>
        <option value="f">Finals!</option>
    </select>
    <div>
        Match number:
        <input placeholder="Input match number here" bind:value={matchNum}>
    </div>
    <div>
        Team number:
        <input placeholder="Input team number here" bind:value={teamNum}>
    </div>
    <button slot="buttons" type="button" class="btn btn-primary" on:click="{() => {updateData}}">Save Info</button>
</Modal>

<Modal title="Your Assigned Teams" id={idTeams}>
    <div>
        {#each teams as assignedTeam}
            <div>
                {assignedTeam}
            </div>
        {/each}
    </div>
</Modal>

<Modal title="Tutorial" id={idTuto}>
    Get good
</Modal>

<Modal title="Flip Field Orientation" id={idFlip}>
    <div class="form-check">
        <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
        <label class="form-check-label" for="flexCheckDefault">
            Flip across X
        </label>
    </div>
    <div class="form-check">
        <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
        <label class="form-check-label" for="flexCheckDefault">
            Flip across Y
        </label>
    </div>
</Modal>