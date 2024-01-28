<script lang="ts">
import { onMount } from 'svelte';
import { App } from '../../models/app/app';
import { update2024 } from '../../models/app/2024-app';
import Timer from '../components/app/Timer.svelte';

let target: HTMLDivElement;

export let app: App;

onMount(() => {
    app.target = target;
    app.launch(update2024);
});
</script>

<div bind:this="{target}" class="position-relative">
    <Timer {app} />
</div>