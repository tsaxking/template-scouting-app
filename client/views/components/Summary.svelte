<script lang="ts">
    import { onMount } from 'svelte';
    import { App } from '../../models/app/app';
    import { actions } from '../../../shared/submodules/tatorscout-calculations/trace';

    export let app: App | undefined = undefined;

    let pulled: {
        [key: string]: number;
    } = {};

    const fns = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (app: App<any>) => {
            if (!app) return;

            const data = app.pull();

            // reset
            pulled = {};

            for (const point of data) {
                const [i, x, y, a] = point;

                if (a) {
                    pulled[actions[a]] = pulled[actions[a]]
                        ? pulled[actions[a]] + 1
                        : 1;
                }
            }

            // reassign to trigger reactivity
            pulled = { ...pulled };
        }
    };

    $: fns.set(app);

    onMount(() => fns.set(app));
</script>

<h5 class="text-center">Summary</h5>
<ul class="list-group">
    {#each Object.keys(pulled) as key}
        <li class="list-group-item">
            {key}: {pulled[key]}
        </li>
    {/each}
</ul>
