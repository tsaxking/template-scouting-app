<script lang="ts">
import { type TBAMatch, matchSort } from "../../../shared/submodules/tatorscout-calculations/tba";
import type { Assignment } from "../../../shared/submodules/tatorscout-calculations/scout-groups";
import { App } from "../../models/app/app";
import { createEventDispatcher } from "svelte";

    const d = createEventDispatcher();

    type M = (TBAMatch & {
        teams: [number, number, number, number, number, number];
        scoutIndex?: number;
    });

    let matches: M[] = [];
    let currentMatch: M | undefined = undefined;

    let matchAssignments: number[] = [];


    const fns = {
        select: async (matchIndex: number, team?: number) => {
            d('select', { matchIndex });
            const res = await App.getEventData();
            if (res.isErr()) return console.error(res.error);
            const eventData = res.value;

            currentMatch = matches[matchIndex];

            if (team === undefined) {
                team = eventData.assignments.matchAssignments[App.group][matchIndex];
            } else {
                App.group = eventData.assignments.groups.findIndex(g => g.includes(team));
            }

            App.matchData.teamNumber = team;
            App.matchData.alliance = currentMatch.alliances.red.team_keys.includes(`frc${App.matchData.teamNumber}`) ? 'red' : 'blue';

            App.selectMatch(currentMatch.match_number, currentMatch.comp_level as 'pr' | 'qm' | 'qf' | 'sf' | 'f');

            matches = matches; // force view update
        },
        getMatches: async (app: App) => {
            const res = await App.getEventData();
            if (res.isErr()) return console.error(res.error);
            const eventData = res.value;

            res.value.matches.sort(matchSort);

            matches = eventData.matches.map(m => {
                return {
                    ...m,
                    teams: [
                        ...m.alliances.red.team_keys.map(t => parseInt(t.slice(3))),
                        ...m.alliances.blue.team_keys.map(t => parseInt(t.slice(3)))
                    ] as [number, number, number, number, number, number],
                    scoutIndex: undefined
                }
            });

            currentMatch = matches.find(m => m.match_number === App.matchData.matchNumber && m.comp_level === App.matchData.compLevel);

            matchAssignments = eventData.assignments.matchAssignments[App.group];
        }
    };

    export let app: App;

    $: fns.getMatches(app);

    App.on('change-group', () => fns.getMatches(app));
    App.on('change-match', () => fns.getMatches(app));
</script>

<table class="table table-dark table-hover">
    <thead>
        <tr>
            <th> Match </th>
            <th> Comp Level </th>
            <th class="text-danger"> Red 1 </th>
            <th class="text-danger"> Red 2 </th>
            <th class="text-danger"> Red 3 </th>
            <th class="text-primary"> Blue 1 </th>
            <th class="text-primary"> Blue 2 </th>
            <th class="text-primary"> Blue 3 </th>
        </tr>
    </thead>
    <tbody>
        {#each matches as match, i}
            <tr
                class="
                    cursor-pointer
                    {
                        // if this is the current match, do bg-secondary on this row
                        matches.findIndex(
                            m =>
                                m.comp_level == currentMatch?.comp_level &&
                                m.match_number == currentMatch?.match_number
                        ) === i ? 'table-primary' : ''
                    }
                "

            >
                <td
                on:click={() => {
                    currentMatch = match;
                    fns.select(i);
                }}>
                    {match.match_number}
                </td>
                <td
                on:click={() => {
                    currentMatch = match;
                    fns.select(i);
                }}>
                    {match.comp_level}
                </td>
                {#each match.teams as team, index}
                    <td class:fw-bold={match.scoutIndex === index} on:click={
                        () => fns.select(i, team)
                    }>
                        {#if index > 2}
                        <!-- Blue alliance -->
                            <span 
                                class:selected-team={
                                    matchAssignments[i] === team
                                }
                                class="text-primary"
                            >{team}</span>
                        {:else}
                        <!-- Red alliance -->
                            <span 
                                class:selected-team={
                                    matchAssignments[i] === team
                                }
                                class="text-danger"
                            >{team}</span>
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>

<style>
    .selected-team {
        color: #5a5555 !important;
        font-weight: bold !important;
    }
</style>