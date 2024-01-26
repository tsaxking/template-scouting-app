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

export const validateObj = {
    checks: (v) => Array.isArray(v) && v.every((v) => typeof v === 'string'),
    comments: (v) => typeof v === 'object' && Object.values(v).every((v) => typeof v === 'string'),
    matchNumber: 'number',
    teamNumber: 'number',
    compLevel: ['pr', 'qm', 'qf', 'sf', 'f'],
}