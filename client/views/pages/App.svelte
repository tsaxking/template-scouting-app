<script lang="ts">
    import { onMount } from 'svelte';
    import { App } from '../../models/app/app';
    import { update2025 } from '../../models/app/2025-app';
    import Timer from '../components/app/Timer.svelte';

    let target: HTMLDivElement;

    export let app: App;

    const fns = {
        launch: (app: App) => {
            if (!app) return;
            if (!target) return;
            app.target = target;
            app.launch(update2025);
        }
    };

    onMount(() => fns.launch(app));

// $: fns.launch(app);
</script>

<div
    bind:this="{target}"
    class="position-relative">
    <Timer bind:app />
</div>
