<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    export let flipX: boolean = false;
    export let flipY: boolean = false;
    const d = createEventDispatcher();
    $: d('flipX', flipX);
    $: d('flipY', flipY);
</script>

<div class="form-check">
    <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault" bind:checked={flipX}>
    <label class="form-check-label" for="flexCheckDefault">
        Flip across Y axis (mirror x)
    </label>
</div>
<div class="form-check">
    <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault" bind:checked={flipY}>
    <label class="form-check-label" for="flexCheckDefault">
        Flip across X axis (mirror y)
    </label>
</div>