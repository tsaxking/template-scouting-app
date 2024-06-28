<script lang="ts">
import type { BootstrapColor } from '../../../submodules/colors/color';
import Checkbox from './Checkbox.svelte';
import { createEventDispatcher } from 'svelte';

export let data: {
    [key: string]: {
        value: boolean;
        color: BootstrapColor;
    };
} = {};

const d = createEventDispatcher();
</script>

<div
    class="btn-group w-100 p-0 d-flex justify-content-center"
    role="group"
    aria-label="Checkboxes"
>
    {#each Object.keys(data) as key}
        <Checkbox
            bind:value="{data[key].value}"
            bind:name="{key}"
            on:change="{e => {
                d('change', {
                    key,
                    value: e.detail
                });
            }}"
            bind:color="{data[key].color}"
        ></Checkbox>
    {/each}
</div>
