<script lang="ts">
import { App } from './../../models/app/app';
import { createEventDispatcher } from 'svelte';
import { Modal } from '../../utilities/modals';
import CustomMatchInfo from './CustomMatchInfo.svelte';
import AssignedTeams from './AssignedTeams.svelte';
import FieldOrientation from './FieldOrientation.svelte';
import { env } from '../../utilities/env';
import { ServerRequest } from '../../utilities/requests';
import { type TBAEvent } from '../../../shared/submodules/tatorscout-calculations/tba';
let matchNum: number;
let teamNum: number;
let compLevel: string;

let assignedTeams: number[] = [];

const d = createEventDispatcher();

const fns = {
    getAssignedTeams: async (groupNum: number): Promise<void | number[]> => {
        const data = await App.getEventData();
        if (data.isOk()) {
            assignedTeams = data.value.assignments.groups[groupNum];
            return assignedTeams;
        }
        return;
    },
    matchInfo: async () => {
        const res = await App.getEventData();
        if (res.isErr()) return console.error(res.error);
        const eventData = res.value;

        const m = new Modal();
        m.setTitle('Enter Custom Match Info');
        m.size = 'lg';

        const data = {
            compLevel: App.matchData.compLevel,
            matchNum: App.matchData.matchNumber,
            teamNum: App.matchData.teamNumber
        };

        let events: TBAEvent[] = App.events;
        if ((await env).ALLOW_PRESCOUTING === 'true' && !events.length) {
            const data = await ServerRequest.post<TBAEvent[]>('/get-events', {
                year: new Date().getFullYear()
            });
            if (data.isOk()) {
                events = data.value;
                App.events = data.value;
            }
        }

        // automatically appends to the body
        const body = new CustomMatchInfo({
            target: m.target.querySelector('.modal-body') as HTMLElement,
            props: {
                teams: eventData.teams.map(t => ({
                    number: t.team_number,
                    name: t.nickname
                })),
                compLevel: App.matchData.compLevel,
                teamNum: App.matchData.teamNumber,
                matchNum: String(App.matchData.matchNumber),
                events: events.filter(
                    e => e.end_date < new Date().toISOString()
                ),
                event: eventData.eventKey
            }
        });

        body.$on('compLevel', e => {
            data.compLevel = e.detail;
        });

        body.$on('matchNum', e => {
            data.matchNum = Number(e.detail);
        });

        body.$on('teamNum', e => {
            data.teamNum = e.detail;
        });

        const save = document.createElement('button');
        save.classList.add('btn', 'btn-primary');
        save.textContent = 'Save';
        save.addEventListener('click', () => {
            m.hide();
            App.matchData.selectMatch(
                data.matchNum,
                data.compLevel,
                data.teamNum || App.matchData.teamNumber
            );
        });
        m.addButton(save);

        m.show();
    },
    assignedTeams: () => {
        const m = new Modal();
        m.setTitle('Your Assigned Teams');
        const body = new AssignedTeams({
            target: m.target.querySelector('.modal-body') as HTMLElement,
            props: {
                group: App.group
            }
        });

        body.$on('group', async (e: CustomEvent<number>) => {
            fns.getAssignedTeams(e.detail);
            App.matchData.selectGroup(e.detail);
            d('group', e.detail);
            const { matchNumber, compLevel } = App.matchData;
            const res = await App.getEventData();

            if (res.isErr()) return console.error(res.error);
            const eventData = res.value;
            const matchIndex = eventData.matches.findIndex(
                m =>
                    m.comp_level === compLevel && m.match_number === matchNumber
            );
            if (matchIndex === -1) return;

            // set matchdata in App
            const match = eventData.matches[matchIndex];
            App.matchData.selectMatch(
                match.match_number,
                match.comp_level as 'qm' | 'qf' | 'sf' | 'f' | 'pr'
            );
        });

        m.show();
    },
    flipField: () => {
        const m = new Modal();
        m.setTitle('Flip Field Orientation');
        const body = new FieldOrientation({
            props: {
                flipX: App.flipX,
                flipY: App.flipY
            },
            target: m.target.querySelector('.modal-body') as HTMLElement
        });

        body.$on('flipX', e => {
            App.flipX = e.detail;
        });

        body.$on('flipY', e => {
            App.flipY = e.detail;
        });

        m.show();
    }
};
</script>

<div class="btn-group w-100 p-0" role="group">
    <button type="button" class="btn btn-primary" on:click="{fns.matchInfo}">
        View and Change Match Info
    </button>
    <!-- <button type="button" class="btn btn-warning">
        Tutorial
    </button> -->
    <button type="button" class="btn btn-info" on:click="{fns.assignedTeams}">
        Your Assigned Teams
    </button>
    <button type="button" class="btn btn-success" on:click="{fns.flipField}">
        Flip Field Orientation
    </button>
</div>
