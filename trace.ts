export type Action = 'spk' | 'amp' | 'src' | 'trp' | 'clb';
export type P = [number, number, number, Action | 0];
export type TraceArray = P[];

/**
 * Description placeholder
 * @date 1/11/2024 - 3:10:27 AM
 *
 * @type {("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:\"<>?`~[]';./=\\,")}
 */
const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:"<>?`~[]\';./=\\,';

const compressI = (num: number) => {
    let str = chars[Math.floor(num / chars.length)] + chars[num % chars.length];
    if (str[0] === 'A') str = str.slice(1); // remove leading A, since that is the default
    return str;
};

const decompressI = (str: string) => {
    if (str.length === 1) str = 'A' + str; // add leading A, since that is the default
    const index = chars.indexOf(str[0]) * chars.length + chars.indexOf(str[1]);
    return index;
};

const compressNum = (num: number) => {
    let str = '';
    while (num > 0) {
        str = chars[num % chars.length] + str;
        num = Math.floor(num / chars.length);
    }
    return str;
}

const decompressNum = (str: string) => {
    let num = 0;
    for (let i = 0; i < str.length; i++) {
        num = num * chars.length + chars.indexOf(str[i]);
    }
    return num;
}

type TraceStatus = 'identical' | 'incorrect-length' | 'incorrect-point' | 'incorrect-action';

export class Trace {
    static encode(trace: TraceArray) {
        return trace.map(Trace.compress);
    }
    static decode(trace: string[]) {
        return trace.map(Trace.decompress);
    }

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

    static decompress(str: string): P {
        const [iStr, xStr, yStr, aStr] = str.split(' ');
        const i = decompressI(iStr);
        const x = decompressNum(xStr) / 10000;
        const y = decompressNum(yStr) / 10000;
        const a = aStr === '' ? 0 : aStr as Action;

        return [i, x, y, a];
    }

    static compare(trace1: TraceArray, trace2: TraceArray):( {
        status: 'incorrect-length',
        l1: number,
        l2: number,
    } | {
        status: 'incorrect-point',
        i: number,
        p1: P,
        p2: P,
    } | {
        status: 'incorrect-action',
        i: number,
        a1: Action | 0,
        a2: Action | 0,
    } | {
        status: 'identical',
    }) {
        if (trace1.length !== trace2.length) return  {
            status: 'incorrect-length',
            l1: trace1.length,
            l2: trace2.length,
        }

        for (let i = 0; i < trace1.length; i++) {
            const p1 = trace1[i];
            const p2 = trace2[i];

            if (p1[0] !== p2[0] || p1[1] !== p2[1]) return {
                status: 'incorrect-point',
                i,
                p1,
                p2,
            }

            if (p1[3] !== p2[3]) return {
                status: 'incorrect-action',
                i,
                a1: p1[3],
                a2: p2[3],
            }
        }



        return {
            status: 'identical',
        }
    }

    static filterPipe(p: P, i: number, a: P[]) {
        if (p[3] !== 0 && a[i - 1]) {
            const x1 = a[i - 1][1];
            const y1 = a[i - 1][2];

            const x2 = p[1];
            const y2 = p[2];

            if (x1 === x2 && y1 === y2) return false;
        }

        return p[1] !== -1 && p[2] !== -1 && p[3] !== 0;
    }

    static velocityMap(trace: TraceArray) {
        return trace.map((p1, i, a) => {
            if (i === a.length - 1) return null;

            const [, x1, y1] = p1;
            const [, x2, y2] = a[i + 1];

            const dx = x2 - x1;
            const dy = y2 - y1;

            const distance = Math.sqrt(dx * dx + dy * dy);

            return distance / .25;
        }).filter((p) => p !== null) as number[];
    }

    static velocityHistogram(trace: TraceArray) {
        const map = Trace.velocityMap(trace);

        const max = Math.max(...map);
        const min = Math.min(...map);

        const range = max - min;

        const buckets = new Array(10).fill(0) as number[];

        map.forEach((v) => {
            const bucket = Math.floor(((v - min) / range) * 10);
            buckets[bucket]++;
        });

        return buckets;
    }
}
