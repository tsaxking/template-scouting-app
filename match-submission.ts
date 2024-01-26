export type Match = {
    checks: string[];
    comments: {
        [key: string]: string;
    };
    matchNumber: number;
    teamNumber: number;
    compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f';
    eventKey: string;
};