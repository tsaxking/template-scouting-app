import { Cache } from "./cache";

type State = {
    scoutName: string;
    team: number;
    match: number;
    eventKey: string;
    alliance: 'red' | 'blue';
    group: 1 | 2 | 3 | 4 | 5 | 6 | null;
    compLevel: 'qm' | 'ef' | 'qf' | 'sf' | 'f' | 'pr';
};

export class Tablet extends Cache {

    constructor(
        public readonly id: string,
        public state: State
    ) {
        super();
    }
}