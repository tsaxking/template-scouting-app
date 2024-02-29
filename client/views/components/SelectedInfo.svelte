<script lang="ts">
import { onMount } from 'svelte';
    import { App } from '../../models/app/app';

    let match: number;
    let team: number;
    let compLevel: string;
    let event: string;
    let scout: string;
    let group: number;
    let alliance: string;

    const select = async () => {
        const eventData = await App.getEventData();
        const { matchData } = App;
        const calculatedAlliance = await matchData.getAlliance();
        if (eventData.isErr()) return console.error(eventData.error);

        match = matchData.matchNumber;
        team = matchData.teamNumber;
        compLevel = (() => {
            switch (matchData.compLevel) {
                case 'qm':
                    return 'Qualifying Match';
                case 'qf':
                    return 'Quarter Finals';
                case 'sf':
                    return 'Semi Finals';
                case 'f':
                    return 'Finals';
                case 'pr':
                    return 'Practice Match';
                default:
                    return 'Unknown'
            }
        })();
        event = eventData.value.event.name;
        scout = App.scoutName;
        group = App.group;
        alliance = calculatedAlliance;
    };

    App.on('change-group', select);
    App.on('change-match', select);
    onMount(select);
</script>

<div class="card mb-3 bg-primary">
    <div class="card-header">
        <h5 class="card-title">Selected Info</h5>
    </div>
    <div class="card-body">
        <div class="row">
            <div class="col">
                <p class="card-text">Match: {match}</p>
                <p class="card-text">Team: {team}</p>
                <p class="card-text">Comp Level: {compLevel}</p>
            </div>
            <div class="col">
                <p class="card-text">Event: {event}</p>
                <p class="card-text">Scout: {scout}</p>
                <p class="card-text">Group: {group}</p>
                <p class="card-text">Alliance: {alliance}</p>
            </div>
        </div>
    </div>
</div>