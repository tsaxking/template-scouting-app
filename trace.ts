/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 *
 * @export
 * @typedef {Action2024}
 */
export type Action2024 = 'spk' | 'amp' | 'src' | 'trp' | 'clb';
/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 *
 * @export
 * @typedef {Action2023}
 */
export type Action2023 = 'cone' | 'cube' | 'balance' | 'pick';

export type Zones2024 =
    | 'blue-auto'
    | 'blue-stage'
    | 'blue-amp'
    | 'blue-src'
    | 'blue-zone'
    | 'red-auto'
    | 'red-stage'
    | 'red-amp'
    | 'red-src'
    | 'red-zone';

export type TraceParse2024 = {
    mobility: boolean;
    parked: boolean;
};

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 *
 * @export
 * @typedef {Action}
 */
export type Action = Action2024 | Action2023;

export type Zones = Zones2024;

export type TraceParse = TraceParse2024;

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 *
 * @export
 * @typedef {P}
 */
export type P = [number, number, number, Action | 0];
/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 *
 * @export
 * @typedef {TraceArray}
 */
export type TraceArray = P[];

/**
 * Description placeholder
 * @date 1/11/2024 - 3:10:27 AM
 *
 * @type {("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:\"<>?`~[]';./=\\,")}
 */
const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:"<>?`~[]\';./=\\,';

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 */
const compressI = (num: number) => {
    let str = chars[Math.floor(num / chars.length)] + chars[num % chars.length];
    if (str[0] === 'A') str = str.slice(1); // remove leading A, since that is the default
    return str;
};

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 */
const decompressI = (str: string) => {
    if (str.length === 1) str = 'A' + str; // add leading A, since that is the default
    const index = chars.indexOf(str[0]) * chars.length + chars.indexOf(str[1]);
    return index;
};

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 */
const compressNum = (num: number) => {
    let str = '';
    while (num > 0) {
        str = chars[num % chars.length] + str;
        num = Math.floor(num / chars.length);
    }
    return str;
};

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:49 PM
 */
const decompressNum = (str: string) => {
    let num = 0;
    for (let i = 0; i < str.length; i++) {
        num = num * chars.length + chars.indexOf(str[i]);
    }
    return num;
};

/**
 * Description placeholder
 * @date 1/25/2024 - 4:58:48 PM
 *
 * @export
 * @class Trace
 * @typedef {Trace}
 */
export class Trace {
    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @param {TraceArray} trace
     * @returns {*}
     */
    static encode(trace: TraceArray) {
        return trace.map(Trace.compress);
    }
    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @param {string[]} trace
     * @returns {*}
     */
    static decode(trace: string[]) {
        return trace.map(Trace.decompress);
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @param {P} point
     * @returns {string}
     */
    static compress(point: P): string {
        const [i, x, y, a] = point;
        // i is a whole number between 0 and 600
        // x is a decimal between 0 and 1 (0.1234)
        // y is a decimal between 0 and 1 (0.1234)
        // a is a 3 character string without any punctuation (spk, amp, src, trp, clb)
        // compress the point to a smaller string

        const iStr = compressI(i);
        const xStr = compressNum(Math.floor(x * 10000));
        const yStr = compressNum(Math.floor(y * 10000));
        const aStr = a === 0 ? ' ' : a;

        return [iStr, xStr, yStr, aStr].join(' ');
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @param {string} str
     * @returns {P}
     */
    static decompress(str: string): P {
        const [iStr, xStr, yStr, aStr] = str.split(' ');
        const i = decompressI(iStr);
        const x = decompressNum(xStr) / 10000;
        const y = decompressNum(yStr) / 10000;
        const a = aStr === '' ? 0 : (aStr as Action);

        return [i, x, y, a];
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @param {TraceArray} trace1
     * @param {TraceArray} trace2
     * @returns {| {
     *             status: 'incorrect-length';
     *             l1: number;
     *             l2: number;
     *         }
     *         | {
     *             status: 'incorrect-point';
     *             i: number;
     *             p1: P;
     *             p2: P;
     *         }
     *         | {
     *             status: 'incorrect-action';
     *             i: number;
     *             a1: Action | 0;
     *             a2: Action | 0;
     *         }
     *         | {
     *             status: 'identical';
     *         }}
     */
    static compare(
        trace1: TraceArray,
        trace2: TraceArray
    ):
        | {
              status: 'incorrect-length';
              l1: number;
              l2: number;
          }
        | {
              status: 'incorrect-point';
              i: number;
              p1: P;
              p2: P;
          }
        | {
              status: 'incorrect-action';
              i: number;
              a1: Action | 0;
              a2: Action | 0;
          }
        | {
              status: 'identical';
          } {
        if (trace1.length !== trace2.length) {
            return {
                status: 'incorrect-length',
                l1: trace1.length,
                l2: trace2.length
            };
        }

        for (let i = 0; i < trace1.length; i++) {
            const p1 = trace1[i];
            const p2 = trace2[i];

            if (p1[0] !== p2[0] || p1[1] !== p2[1]) {
                return {
                    status: 'incorrect-point',
                    i,
                    p1,
                    p2
                };
            }

            if (p1[3] !== p2[3]) {
                return {
                    status: 'incorrect-action',
                    i,
                    a1: p1[3],
                    a2: p2[3]
                };
            }
        }

        return {
            status: 'identical'
        };
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @param {P} p
     * @param {number} i
     * @param {P[]} a
     * @returns {boolean}
     */
    static filterPipe(p: P, i: number, a: P[]) {
        if (p[3] !== 0 && a[i - 1]) {
            const x1 = a[i - 1][1];
            const y1 = a[i - 1][2];

            const x2 = p[1];
            const y2 = p[2];

            if (x1 === x2 && y1 === y2) return false;
        }

        return p[1] !== -1 && p[2] !== -1;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @template [T=Action]
     * @param {T} action
     * @returns {(p: P) => boolean}
     */
    static filterAction<T = Action>(action: T) {
        return (p: P) => p[3] === action;
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @readonly
     * @type {{ map: (trace: {}) => {}; total: (trace: {}) => any; }}
     */
    static get distance() {
        return {
            map: (trace: TraceArray) => {
                return trace
                    .map((p1, i, a) => {
                        if (i === a.length - 1) return null;

                        const [, x1, y1] = p1;
                        const [, x2, y2] = a[i + 1];

                        const dx = x2 - x1;
                        const dy = y2 - y1;

                        const distance = Math.sqrt(dx * dx + dy * dy);

                        return distance;
                    })
                    .filter(p => p !== null) as number[];
            },
            total: (trace: TraceArray) => {
                const map = Trace.distance.map(trace);

                return map.reduce((a, b) => a + b, 0);
            }
        };
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @readonly
     * @type {{ map: (trace: {}) => {}; histogram: (trace: {}) => {}; average: (trace: {}) => number; }}
     */
    static get velocity() {
        return {
            map: (trace: TraceArray) => {
                return trace
                    .map((p1, i, a) => {
                        if (i === a.length - 1) return null;

                        const [, x1, y1] = p1;
                        const [, x2, y2] = a[i + 1];

                        const dx = x2 - x1;
                        const dy = y2 - y1;

                        const distance = Math.sqrt(dx * dx + dy * dy);

                        return distance / 0.25;
                    })
                    .filter(p => p !== null) as number[];
            },
            histogram: (trace: TraceArray) => {
                const map = Trace.velocity.map(trace);

                const max = Math.max(...map);
                const min = Math.min(...map);

                const range = max - min;

                const buckets = new Array(10).fill(0) as number[];

                map.forEach(v => {
                    const bucket = Math.floor(((v - min) / range) * 10);
                    buckets[bucket]++;
                });

                return buckets;
            },
            average: (trace: TraceArray) => {
                const map = Trace.velocity.map(trace);

                return map.reduce((a, b) => a + b, 0) / map.length;
            }
        };
    }

    /**
     * Description placeholder
     * @date 1/25/2024 - 4:58:48 PM
     *
     * @static
     * @readonly
     * @type {{ compress: (str: string | number) => string; decompress: (str: string) => string; encode: (trace: {}) => {}; decode: (trace: {}) => any; }}
     */
    static get old() {
        const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:"<>?`~[]\';./=\\,';

        const parse = (str: string): [number, number, number] => {
            return [
                +str.slice(0, 2) / 100,
                +str.slice(2, 4) / 100,
                +str.slice(4, 10) / 1000
            ];
        };

        return {
            compress: (str: string | number) => {
                let num = +str;
                const base = chars.length;
                let result = '';
                while (num > 0) {
                    result = chars[num % base] + result;
                    num = Math.floor(num / base);
                }
                return result;
            },
            decompress: (str: string) => {
                const base = chars.length;
                let num = 0;
                for (let i = 0; i < str.length; i++) {
                    num +=
                        chars.indexOf(str[i]) *
                        Math.pow(base, str.length - i - 1);
                }
                str = num.toString();

                return new Array(10 - str.length).fill('0').join('') + str;
            },
            encode: (
                trace: [string | number, string | number, string | number][]
            ): string[] => {
                return trace.map(p => p.map(Trace.old.compress).join(' '));
            },
            decode: (trace: string[]) => {
                return trace.map(Trace.old.decompress);
            }
        };
    }
}

export type Match = {
    checks: string[];
    comments: {
        [key: string]: string;
    };
    matchNumber: number;
    teamNumber: number;
    compLevel: 'pr' | 'qm' | 'qf' | 'sf' | 'f';
    eventKey: string;
    scout: string;
    date: number;
    group: 0 | 1 | 2 | 3 | 4 | 5;
    trace: TraceArray;
};

export const validateObj = {
    checks: v => Array.isArray(v) && v.every(v => typeof v === 'string'),
    comments: v =>
        typeof v === 'object' &&
        Object.values(v).every(v => typeof v === 'string'),
    matchNumber: 'number',
    teamNumber: 'number',
    compLevel: ['pr', 'qm', 'qf', 'sf', 'f'],
    eventKey: 'string',
    scout: 'string',
    date: 'number',
    group: [0, 1, 2, 3, 4, 5]
};
