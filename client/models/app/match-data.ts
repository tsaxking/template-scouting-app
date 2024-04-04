import { attempt, attemptAsync } from '../../../shared/check';
import { teamsFromMatch } from '../../../shared/submodules/tatorscout-calculations/tba';
import { TBAMatch } from '../../../shared/tba';
import { App } from './app';

const filter = (m: TBAMatch): number[] =>
    teamsFromMatch(m).filter((_, i) => ![3, 7].includes(i)) as number[];
    // .filter(Boolean) as number[];
export class MatchData {
    public static get(): MatchData {
        const d = window.localStorage.getItem('matchData');
        if (!d) return new MatchData();
        const data = JSON.parse(d) as {
            matchNumber: number;
            teamNumber: number;
            compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f';
            group: number;
        };
        return new MatchData(
            +data.matchNumber,
            +data.teamNumber,
            data.compLevel,
            +data.group
        );
    }

    constructor(
        public $matchNumber: number = 0,
        public $teamNumber: number = 0,
        public $compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f' = 'pr',
        public $group: number = -1
    ) {}

    public get matchNumber() {
        return this.$matchNumber;
    }

    private set matchNumber(matchNumber: number) {
        this.$matchNumber = +matchNumber;
        this.save();
    }

    public get teamNumber() {
        return this.$teamNumber;
    }

    private set teamNumber(teamNumber: number) {
        this.$teamNumber = +teamNumber;
        this.save();
    }

    public get group() {
        return this.$group;
    }

    public set group(group: number) {
        this.$group = +group;
        this.save();
    }

    public async getAlliance(): Promise<'red' | 'blue' | null> {
        const res = await App.getEventData();
        if (res.isErr()) return null;

        const { matches } = res.value;
        const match = matches.find(
            m =>
                m.match_number === this.matchNumber &&
                m.comp_level === this.compLevel
        );

        if (!match) return null;

        // console.log(match, this.teamNumber);

        if (match.alliances.red.team_keys.includes(`frc${this.$teamNumber}`)) {
            return 'red';
        }
        if (match.alliances.blue.team_keys.includes(`frc${this.$teamNumber}`)) {
            return 'blue';
        }
        return null;
    }

    public get compLevel() {
        return this.$compLevel;
    }

    public set compLevel(compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f') {
        this.$compLevel = compLevel;
        this.save();
    }

    private save() {
        window.localStorage.setItem(
            'matchData',
            JSON.stringify({
                matchNumber: +this.$matchNumber,
                teamNumber: +this.$teamNumber,
                compLevel: this.$compLevel,
                group: +this.group
            })
        );

        App.emit('select-match', this);
    }

    async getCurrentMatch() {
        return attemptAsync(async () => {
            const eventData = await App.getEventData();
            if (eventData.isErr()) throw eventData.error;

            const match = eventData.value.matches.find(
                m =>
                    m.match_number === this.matchNumber &&
                    m.comp_level === this.compLevel
            );

            return match;
        });
    }

    async selectGroup(group: number) {
        return attemptAsync(async () => {
            const eventData = await App.getEventData();
            if (eventData.isErr()) throw eventData.error;

            const match = eventData.value.matches.find(
                m =>
                    m.match_number === this.matchNumber &&
                    m.comp_level === this.compLevel
            );

            if (!match) throw new Error('Match not found');

            const index = eventData.value.matches.indexOf(match);
            if (group >= 6) throw new Error('Group not found');
            this.group = group;

            this.teamNumber =
                eventData.value.assignments.matchAssignments[group][index];

            this.save();
        });
    }

    async selectMatch(
        matchNumber: number,
        compLevel: 'qm' | 'qf' | 'sf' | 'f' | 'pr',
        teamNumber?: number
    ) {
        return attemptAsync(async () => {
            if (compLevel === 'pr') {
                this.compLevel = 'pr';
                this.matchNumber = matchNumber;
                this.teamNumber = teamNumber || 0;
                this.save();
                return;
            }

            const current = this.matchNumber;
            const currentTeam = this.teamNumber;
            const indexMove = matchNumber - current;
            const result = await this.moveIndex(indexMove);
            if (result.isErr()) throw result.error;

            const currentMatch = await this.getCurrentMatch();
            if (currentMatch.isErr()) throw currentMatch.error;

            if (currentMatch.value) {
                console.log('Found match', currentMatch.value);
                if (teamNumber) {
                    const teams = teamsFromMatch(currentMatch.value).filter(Boolean);
                    if (teams.includes(teamNumber)) {
                        this.teamNumber = teamNumber;
                    } else {
                        this.teamNumber = teams[0];
                    }
                    this.matchNumber = matchNumber;
                    this.compLevel = compLevel;
                } else {
                    const teams = teamsFromMatch(currentMatch.value).filter(Boolean);
                    this.matchNumber = matchNumber;
                    this.compLevel = compLevel;
                    
                    const m = await this.getCurrentMatch();
                    if (m.isErr()) throw m.error;
                    if (!m.value) throw new Error('Match not found');
                    const newTeams = teamsFromMatch(m.value).filter(Boolean);
                    let index = teams.indexOf(currentTeam);
                    if (index === -1) index = 0;
                    this.teamNumber = newTeams[index];
                }
            }


            this.save();

            return result.value;
        });
    }

    async moveIndex(i: number) {
        return attemptAsync(async () => {
            const eventData = await App.getEventData();
            if (eventData.isErr()) throw eventData.error;
            const { group } = App;

            let currentIndex = eventData.value.matches.findIndex(
                m =>
                    m.match_number === this.matchNumber &&
                    m.comp_level === this.compLevel
            );

            if (currentIndex === -1 && i !== 1) currentIndex = 0;

            const prev = eventData.value.matches[currentIndex];
            const prevTeams = filter(prev);
            currentIndex += i;

            const match = eventData.value.matches[currentIndex];

            if (!match) {
                throw new Error('Match not found, match not changed');
            }

            const teams: number[] = filter(match);

            if (group === -1) {
                const teamIndex = prevTeams.indexOf(this.teamNumber) || 0;
                this.teamNumber = teams[teamIndex];
            } else {
                this.teamNumber = teams[group];
            }

            this.matchNumber = match.match_number;

            this.save();
        });
    }

    async prev() {
        return this.moveIndex(-1);
    }

    async next() {
        return this.moveIndex(1);
    }
}
