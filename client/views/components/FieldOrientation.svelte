<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    // export let flipX: boolean = false;
    // export let flipY: boolean = false;
    export let rotate: boolean = false;
    const d = createEventDispatcher();
    // $: d('flipX', flipX);
    // $: d('flipY', flipY);
    $: d('rotate', rotate);
</script>

<div class="form-check">
    <div class="form-check">
        <input
            id="flexCheckDefault"
            class="form-check-input"
            type="checkbox"
            value=""
            bind:checked="{rotate}"
        />
        <label
            class="form-check-label"
            for="flexCheckDefault">
            Rotate field
        </label>
    </div>
</div>
