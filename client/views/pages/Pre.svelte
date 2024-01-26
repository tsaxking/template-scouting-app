<script lang="ts">
import type { TBAMatch } from '../../../shared/submodules/tatorscout-calculations/tba';
import { teamsFromMatch } from '../../../shared/submodules/tatorscout-calculations/tba';

export let matches: TBAMatch[] = [];
export let scoutTeamOrder: number[] = [];

export let currentMatch: TBAMatch | undefined = undefined;

let matchData: (TBAMatch & {
    teams: [number, number, number, number, number, number];
    scoutIndex: number | undefined;
})[] = [];
$: {
    matchData = matches.map((m, i) => {
        if (!scoutTeamOrder[i])
            console.warn(`No scout team order for match ${m.key}`);
        const teams = teamsFromMatch(m);
        return {
            ...m,
            teams,
            scoutIndex: teams.indexOf(scoutTeamOrder[i])
        };
    });
}
</script>

<div>
    <table class="table table-dark table-striped">
        <thead>
            <tr>
                <th> Match </th>
                <th> Comp Level </th>
                <th> Red 1 </th>
                <th> Red 2 </th>
                <th> Red 3 </th>
                <th> Blue 1 </th>
                <th> Blue 2 </th>
                <th> Blue 3 </th>
            </tr>
        </thead>
        <tbody>
            {#each matchData as match, i}
                <tr
                    class:fw-bold="{matchData.findIndex(
                        m =>
                            m.comp_level == currentMatch?.comp_level &&
                            m.match_number == currentMatch?.match_number
                    ) === i}"
                >
                    <td>
                        {match.match_number}
                    </td>
                    <td>
                        {match.comp_level}
                    </td>
                    {#each match.teams as team, index}
                        <td class:fst-italic="{match.scoutIndex === index}">
                            {#if index > 2}
                                <span class="text-primary">{team}</span>
                            {:else}
                                <span class="text-danger">{team}</span>
                            {/if}
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
