<script lang='ts'>
    import { App } from './../../models/app/app';
    import { createEventDispatcher } from 'svelte';
    import { Modal } from '../../utilities/modals';
    import CustomMatchInfo from './CustomMatchInfo.svelte';
import AssignedTeams from './AssignedTeams.svelte';
import FieldOrientation from './FieldOrientation.svelte';
    let matchNum: number;
    let teamNum: number;
    let compLevel: string;

    let assignedTeams: number[] = [];


    const d = createEventDispatcher();


    const fns = {
        getAssignedTeams: async (groupNum: number): Promise<void | number[]> => {
            const data = await App.getEventData()
            if(data.isOk()){
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

            const data = {
                compLevel: compLevel as 'pr' | 'qm' | 'qf' | 'sf' | 'f',
                matchNum: matchNum,
                teamNum: teamNum
            };
            
            // automatically appends to the body
            const body = new CustomMatchInfo({
                target: m.el.querySelector('.modal-body'),
                props: {
                    teams: eventData.teams.map(t => ({number: t.team_number, name: t.nickname})),
                    compLevel: compLevel as 'pr' | 'qm' | 'qf' | 'sf' | 'f',
                    teamNum: teamNum,
                    matchNum: String(matchNum)
                }
            });

            body.$on('compLevel', (e) => {
                data.compLevel = e.detail;
            });

            body.$on('matchNum', (e) => {
                data.matchNum = Number(e.detail);
            });

            body.$on('teamNum', (e) => {
                data.teamNum = e.detail;
            });

            const save = document.createElement('button');
            save.classList.add('btn', 'btn-primary');
            save.textContent = 'Save';
            save.addEventListener('click', () => {
                m.hide();
                App.matchData.teamNumber = data.teamNum || App.matchData.teamNumber;

                const match = eventData.matches.find(m => m.comp_level === data.compLevel && m.match_number === data.matchNum);
                if (!match) {
                    console.error('Could not find match, assigning alliance to null');
                    return App.matchData.alliance = null;
                }
                const alliance = match.alliances.red.team_keys.includes(`frc${data.teamNum}`) ? 'red' : 'blue';
                App.matchData.alliance = alliance;

                App.selectMatch(data.matchNum, data.compLevel)
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

            body.$on('group', async (e) => {
                fns.getAssignedTeams(e.detail);
                d('group', e.detail);
                App.group = e.detail;
                const { matchNumber, compLevel } = App.matchData;
                const res = await App.getEventData();

                if (res.isErr()) return console.error(res.error);
                const eventData = res.value;
                const matchIndex = eventData.matches.findIndex(m => m.comp_level === compLevel && m.match_number === matchNumber);
                if (matchIndex === -1) return;

                // set matchdata in App
                const match = eventData.matches[matchIndex];
                App.matchData.matchNumber = match.match_number;
                App.matchData.compLevel = match.comp_level as 'pr' | 'qm' | 'qf' | 'sf' | 'f';
                App.matchData.teamNumber = eventData.assignments.groups[App.group][matchIndex];
                App.matchData.alliance = match.alliances.red.team_keys.includes(`frc${App.matchData.teamNumber}`) ? 'red' : 'blue';
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
                target: m.el.querySelector('.modal-body')
            });

            body.$on('flipX', (e) => {
                App.flipX = e.detail;
            });

            body.$on('flipY', (e) => {
                App.flipY = e.detail;
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