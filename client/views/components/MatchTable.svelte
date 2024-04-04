<script lang="ts">
import {
    type TBAMatch,
    type MatchTeams,
    matchSort,
    teamsFromMatch
} from '../../../shared/submodules/tatorscout-calculations/tba';
import { App } from '../../models/app/app';
import { createEventDispatcher, onMount } from 'svelte';
import { MatchData } from '../../models/app/match-data';
import { getMaxListeners } from 'events';

const d = createEventDispatcher();

type M = TBAMatch & {
    teams: [number, number, number, number, number, number];
    scoutIndex?: number;
};

export let matches: TBAMatch[] = [];

let customMatches: M[] = [];
let currentMatch: M | undefined = undefined;
let currentMatchIndex: number | undefined = undefined;
let currentTeam: number | undefined = undefined;

let matchAssignments: number[] = [];

App.on('new-event', async () => {
    console.log('new event');
    await fns.getMatches(app);
    await fns.setCustom(matches);
});

const fns = {
    setCustom: async (m: TBAMatch[]) => {
        // if (customMatches.length) return; // avoid infinite loop
        const res = await App.getEventData();
        if (res.isErr()) return console.error(res.error);
        const eventData = res.value;

        customMatches = m.map((match, i) => {
            const teams = teamsFromMatch(match).filter(Boolean);
            return {
                ...match,
                teams,
                scoutIndex: teams.findIndex(
                    t =>
                        t ===
                        eventData.assignments.matchAssignments[App.group]?.[i]
                )
            };
        }) as M[];
    },
    select: async (matchIndex: number, teamIndex?: number) => {
        d('select', { matchIndex, teamIndex });
        console.log('select', matchIndex, teamIndex);
        const res = await App.getEventData();
        if (res.isErr()) return console.error(res.error);
        const eventData = res.value;

        fns.setCustom(eventData.matches);

        currentMatch = customMatches[matchIndex];
        let team: number | undefined = undefined;

        let g = App.group;

        if (+g === -1) g = 0;

        const useTeamIndex = () => {
            if (teamIndex === undefined)
                throw new Error(
                    'teamIndex is undefined, this should not happen'
                );
            team = currentMatch?.teams[teamIndex];

            if (team !== undefined) {
                currentTeam = team;

                const groupIndex =
                    eventData.assignments.matchAssignments.findIndex(
                        a => a[matchIndex] === team
                    );
                App.matchData.selectGroup(groupIndex);
                fns.getMatches(app);
            }
        };

        if (typeof teamIndex === 'number' && teamIndex >= 0 && teamIndex < 6) {
            // use teamIndex, and force scout group
            useTeamIndex();
        } else if (App.group !== -1) {
            // use scout group only
            team =
                eventData.assignments.matchAssignments[App.group]?.[matchIndex];
        } else {
            teamIndex = 0;
            useTeamIndex();
        }

        if (team !== undefined) {
            currentTeam = team;
        }

        App.matchData.selectMatch(
            currentMatch?.match_number || 0,
            (currentMatch?.comp_level as 'qm' | 'qf' | 'sf' | 'f' | 'pr') ||
                'qm',
            team || 0
        );
    },
    getMatches: async (app: App) => {
        const res = await App.getEventData();
        if (res.isErr()) return console.error(res.error);
        const eventData = res.value;

        res.value.matches.sort(matchSort);

        matches = eventData.matches.map(m => {
            return {
                ...m,
                teams: teamsFromMatch(m).filter(Boolean),
                scoutIndex: undefined
            };
        });

        matchAssignments = eventData.assignments.matchAssignments[App.group];
        fns.setCustom(matches);
        currentMatchIndex = matches.findIndex(
            m =>
                m.comp_level === App.matchData.compLevel &&
                m.match_number === App.matchData.matchNumber
        );
        currentMatch = customMatches[currentMatchIndex];
        currentTeam = matchAssignments?.[+currentMatchIndex] || -1;
    }
};

export let app: App;

$: {
    fns.getMatches(app);
}

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
                    {// if this is the current match, do bg-secondary on this row
                customMatches.findIndex(
                    m =>
                        m.comp_level == currentMatch?.comp_level &&
                        m.match_number == currentMatch?.match_number
                ) === i
                    ? 'table-primary'
                    : ''}
                "
            >
                <td
                    on:click="{() => {
                        currentMatch = match;
                        fns.select(i);
                    }}"
                >
                    {match.match_number}
                </td>
                <td
                    on:click="{() => {
                        currentMatch = match;
                        fns.select(i);
                    }}"
                >
                    {match.comp_level}
                </td>
                {#each match.teams as team, index}
                    <td
                        class:fw-bold="{match.scoutIndex === index}"
                        on:click="{() => fns.select(i, index)}"
                    >
                        {#if index > 2}
                            <!-- Blue alliance -->
                            <span
                                class:selected-team="{currentMatchIndex === i &&
                                    currentTeam === team}"
                                class:is-group="{matchAssignments?.[i] ===
                                    index}"
                                style="color: rgba(0, 123, 255, 1)">{team}</span
                            >
                        {:else}
                            <!-- Red alliance -->
                            <span
                                class="text-danger"
                                class:selected-team="{currentMatchIndex === i &&
                                    currentTeam === team}"
                                class:is-group="{matchAssignments?.[i] ===
                                    index}"
                                style="color: rgba(220, 53, 69, 1)">{team}</span
                            >
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>

<style>
.is-group {
    font-weight: bold !important;
}
.selected-team {
    color: #5a5555 !important;
}
</style>
