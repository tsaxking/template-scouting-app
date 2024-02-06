<script lang='ts'>
    import {App} from './../../models/app/app';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    const title = "Custom match info";
    const message: string = 'Input custom match info here!';
    const id: string = 'modal-' + Math.random().toString(36);
    export let app: App;

    let matchNum: number;
    let teamNum: number;
    let matchType: string;
    
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
    <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#{id}">
        Enter Custom Match Info
    </button>
    <button type="button" class="btn btn-warning">
        Tutorial
    </button>
    <button type="button" class="btn btn-info">
        Your Assigned Teams
    </button>
    <button type="button" class="btn btn-success">
        Flip Field Orientation
    </button>
</div>

<div class="modal fade" tabindex="-1" aria-modal="true" role="dialog" {id}>
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{title}</h5>
                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    on:click="{() => dispatch('hide')}"
                ></button>
            </div>              
            <div class="modal-body">
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
            </div>
            <div class="modal-footer">
                <button
                    type="button"
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                    on:click="{() => dispatch('close')}">Close
                </button>
                
                <button type="button" class="btn btn-primary" 
                on:click={() => updateData()}> 
                    Save changes
                </button>
                <slot name="buttons" />
            </div>
        </div>
    </div>
</div>