<script lang="ts">
    import { ServerStat, Blank } from '../../models/server-stats';
    import { Line } from 'svelte-chartjs';
    import { dateString } from '../../../shared/clock';
    import { Color } from '../../submodules/colors/color';
    import { onMount } from 'svelte';

    const time = dateString('h:mm:ss AM');

    const serverStats = ServerStat.stats;
    let stats: (ServerStat | Blank)[] = [];
    onMount(() => {
        const u = serverStats.subscribe(v => {
            stats = v;
        });
        return () => {
            u();
        };
    });
</script>

<div class="card">
    <Line
        data="{{
            labels: stats.map(stat => time(stat.time)),
            datasets: [
                {
                    label: 'CPU Usage',
                    data: stats.map(stat => stat.cpu.speed),
                    borderColor: Color.fromBootstrap('primary')
                        .setAlpha(0.5)
                        .toString('rgba'),
                    backgroundColor: Color.fromBootstrap('primary')
                        .setAlpha(0.1)
                        .toString('rgba')
                },
                {
                    label: 'Memory Usage',
                    data: stats.map(stat => (stat.memory.used / stat.memory.total) * 100),
                    borderColor: Color.fromBootstrap('danger')
                        .setAlpha(0.5)
                        .toString('rgba'),
                    backgroundColor: Color.fromBootstrap('danger')
                        .setAlpha(0.1)
                        .toString('rgba')
                },
                {
                    label: 'CPU Temperature',
                    data: stats.map(stat => stat.temp.main * 1000),
                    borderColor: Color.fromBootstrap('warning')
                        .setAlpha(0.5)
                        .toString('rgba'),
                    backgroundColor: Color.fromBootstrap('warning')
                        .setAlpha(0.1)
                        .toString('rgba')
                }
            ]
        }}"
        options="{{
            scales: {
                y: {
                    min: 0,
                    max: 100,
                }
            }
        }}"
    />
</div>
