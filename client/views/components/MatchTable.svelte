<script lang="ts">
import type { TBAMatch } from "../../../shared/submodules/tatorscout-calculations/tba";
import { App } from "../../models/app/app";
import { createEventDispatcher } from "svelte";

    const d = createEventDispatcher();

    type M = (TBAMatch & {
        teams: [number, number, number, number, number, number];
        scoutIndex?: number;
    });

    let matches: M[] = [];
    let currentMatch: M | undefined = undefined;


    const fns = {
        select: async (matchIndex: number, teamIndex?: number) => {
            d('select', { matchIndex, teamIndex });
            const res = await App.getEventData();
            if (res.isErr()) return console.error(res.error);
            const eventData = res.value;

            currentMatch = matches[matchIndex];
            let team: number | undefined = undefined;

            if (teamIndex === undefined) {
                team = eventData.assignments.matchAssignments[matchIndex][App.group];
            } else {
                team = currentMatch.teams[teamIndex];
                App.group = eventData.assignments.groups.findIndex(g => g.includes(App.matchData.teamNumber));
            }

            App.matchData.matchNumber = currentMatch.match_number;
            App.matchData.compLevel = currentMatch.comp_level as 'pr' | 'qm' | 'qf' | 'sf' | 'f';
            App.matchData.teamNumber = team;
            App.matchData.alliance = currentMatch.alliances.red.team_keys.includes(`frc${App.matchData.teamNumber}`) ? 'red' : 'blue';

            matches = matches; // force view update
        }
    };
</script>

<table class="table table-dark table-striped table-hover">
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
                        ) === i ? 'bg-secondary' : ''
                    }
                "

                on:click={() => {
                    currentMatch = match;
                    fns.select(i);
                }}
            >
                <td>
                    {match.match_number}
                </td>
                <td>
                    {match.comp_level}
                </td>
                {#each match.teams as team, index}
                    <td class:fw-bold={match.scoutIndex === index} on:click={
                        () => fns.select(i, index)
                    }>
                        {#if index > 2}
                        <!-- Blue alliance -->
                            <span class="text-primary">{team}</span>
                        {:else}
                        <!-- Red alliance -->
                            <span class="text-danger">{team}</span>
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>