<script lang='ts'>
    import { App } from './../../models/app/app';
    import { createEventDispatcher } from 'svelte';
    import { Modal } from '../../utilities/modals';
    import CustomMatchInfo from './CustomMatchInfo.svelte';
import type { TBATeam } from '../../../shared/submodules/tatorscout-calculations/tba';
import AssignedTeams from './AssignedTeams.svelte';
import FieldOrientation from './FieldOrientation.svelte';

    export let teams: TBATeam[] = [];
    let matchNum: number;
    let teamNum: number;
    let compLevel: string;

    let assignedTeams: number[] = [];


    const d = createEventDispatcher();


    const fns = {
        getAssignedTeams: async (groupNum: number) => {
            const data = await App.getEventData()
            if(data.isOk()){
                assignedTeams = data.value.assignments.groups[groupNum];
            }  
        },
        matchInfo: () => {
            const m = new Modal();
            m.setTitle('Enter Custom Match Info');

            const data = {
                compLevel: compLevel as 'pr' | 'qm' | 'qf' | 'sf' | 'f',
                matchNum: matchNum,
                teamNum: teamNum
            };
            
            // automatically appends to the body
            const body = new CustomMatchInfo({
                target: m.el.querySelector('.modal-body'),
                props: {
                    teams: teams.map(t => ({number: t.team_number, name: t.nickname})),
                    compLevel: compLevel as 'pr' | 'qm' | 'qf' | 'sf' | 'f',
                    teamNum: teamNum,
                    matchNum: matchNum
                }
            });

            body.$on('compLevel', (e) => {
                data.compLevel = e.detail;
            });

            body.$on('matchNum', (e) => {
                data.matchNum = +e.detail;
            });

            body.$on('teamNum', (e) => {
                data.teamNum = +e.detail;
            });

            const save = document.createElement('button');
            save.classList.add('btn', 'btn-primary');
            save.textContent = 'Save';
            save.addEventListener('click', () => {
                App.matchData.compLevel = data.compLevel;
                App.matchData.number = data.matchNum;
                App.matchData.teamNumber = data.teamNum;
                m.hide();
            });
            m.addButton(save);

            m.show();
        },
        assignedTeams: () => {
            const m = new Modal();
            m.setTitle('Your Assigned Teams');
            const body = new AssignedTeams({
                target: m.el.querySelector('.modal-body'),
                props: {
                    group: App.group
                }
            });

            body.$on('group', (e) => {
                fns.getAssignedTeams(e.detail);
                d('group', e.detail);
            });
        },
        flipField: () => {
            const m = new Modal();
            m.setTitle('Flip Field Orientation');
            const body = new FieldOrientation({
                target: m.el.querySelector('.modal-body')
            });

            body.$on('flipX', (e) => {
                d('flipX', e.detail);
            });

            body.$on('flipY', (e) => {
                d('flipY', e.detail);
            });

            m.show();
        }
    };
</script>

<div class="btn-group w-100" role="group">
    <button type="button" class="btn btn-primary" on:click={fns.matchInfo}>
        Enter Custom Match Info
    </button>
    <!-- <button type="button" class="btn btn-warning">
        Tutorial
    </button> -->
    <button type="button" class="btn btn-info" on:click={fns.assignedTeams}>
        Your Assigned Teams
    </button>
    <button type="button" class="btn btn-success" on:click={fns.flipField}>
        Flip Field Orientation
    </button>
</div>