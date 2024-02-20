<script lang="ts">
import { type TBAMatch, matchSort } from "../../../shared/submodules/tatorscout-calculations/tba";
import { App } from "../../models/app/app";
import { createEventDispatcher, onMount } from "svelte";

    const d = createEventDispatcher();

    type M = (TBAMatch & {
        teams: [number, number, number, number, number, number];
        scoutIndex?: number;
    });

    export let matches: TBAMatch[] = [];

    let customMatches: M[] = [];
    let currentMatch: M | undefined = undefined;
    let currentMatchIndex: number | undefined = undefined;

    let matchAssignments: number[] = [];


    const fns = {
        setCustom: async (m: TBAMatch[]) => {
            if (customMatches.length) return; // avoid infinite loop
            const res = await App.getEventData();
            if (res.isErr()) return console.error(res.error);
            const eventData = res.value;

            customMatches = m.map((match, i) => {
                const teams = match.alliances.red.team_keys.concat(match.alliances.blue.team_keys).map(t => parseInt(t.slice(3)));
                return {
                    ...match,
                    teams,
                    scoutIndex: teams.findIndex(t => t === eventData.assignments.matchAssignments[App.group][i])
                };
            }) as M[];
        },
        select: async (matchIndex: number, teamIndex?: number) => {
            d('select', { matchIndex, teamIndex });
            const res = await App.getEventData();
            if (res.isErr()) return console.error(res.error);
            const eventData = res.value;

            fns.setCustom(eventData.matches);

            currentMatch = customMatches[matchIndex];
            let team: number | undefined = undefined;

            if (team === undefined) {
                team = eventData.assignments.matchAssignments[App.group][matchIndex];
            } else {
                App.group = eventData.assignments.groups.findIndex(g => g.includes(team));
            }

            App.matchData.teamNumber = team;
            App.matchData.alliance = currentMatch.alliances.red.team_keys.includes(`frc${App.matchData.teamNumber}`) ? 'red' : 'blue';

            App.selectMatch(currentMatch.match_number, currentMatch.comp_level as 'pr' | 'qm' | 'qf' | 'sf' | 'f');

            currentMatchIndex = matchIndex;
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

            matchAssignments = eventData.assignments.matchAssignments[App.group];
            fns.setCustom(matches);
            currentMatchIndex = matches.findIndex(
                m =>
                    m.comp_level === App.matchData.compLevel &&
                    m.match_number === App.matchData.matchNumber
            );
            currentMatch = customMatches[currentMatchIndex];
        }
    };

    export let app: App;

    $: {
        fns.getMatches(app);
    }

    App.on('change-group', () => fns.getMatches(app));
    App.on('change-match', () => fns.getMatches(app));

    onMount(() => {
        fns.getMatches(app);
    });
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
        {#each customMatches as match, i}
            <tr
                class="
                    cursor-pointer
                    {
                        // if this is the current match, do bg-secondary on this row
                        customMatches.findIndex(
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