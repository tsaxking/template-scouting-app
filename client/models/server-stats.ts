import { Loop } from '../../shared/loop';
import { Systeminformation } from 'systeminformation';
import { ServerRequest } from '../utilities/requests';
import { writable } from 'svelte/store';

export class Blank {
    public readonly time = new Date();

    public readonly cpu = {
        speed: 0
    };

    public readonly memory = {
        used: 0,
        total: 1
    };

    public readonly temp = {
        main: 0
    };

    constructor() {}
}

export class ServerStat {
    static readonly stats = writable<(ServerStat | Blank)[]>(
        Array.from({
            length: 6 * 5 // 10 sec intervals for 5 minutes
        })
            .fill(0)
            .map(() => new Blank())
    );

    public readonly time = new Date();

    constructor(
        public readonly cpu: Systeminformation.CpuData,
        public readonly memory: Systeminformation.MemData,
        public readonly temp: Systeminformation.CpuTemperatureData
    ) {
        ServerStat.stats.update(stats => {
            stats.push(this);
            return stats;
        });
    }
}

const retrieve = async () => {
    const res = await ServerRequest.post<{
        cpu: Systeminformation.CpuData;
        memory: Systeminformation.MemData;
        temp: Systeminformation.CpuTemperatureData;
    }>('/admin/computer-state');

    if (res.isErr()) return console.error(res.error);
    const stats = res.value;

    new ServerStat(stats.cpu, stats.memory, stats.temp);
};

const l = new Loop(retrieve, 1000 * 10); // 10 seconds
l.start();
