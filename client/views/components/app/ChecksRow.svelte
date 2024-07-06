<script lang="ts">
import type { BootstrapColor } from '../../../submodules/colors/color';
import type { PostDataMap } from '../../../utilities/general-types';
import Checkbox from './Checkbox.svelte';
import { createEventDispatcher } from 'svelte';

export let checks: PostDataMap;
export let color: BootstrapColor;
export let name: string;

const d = createEventDispatcher();
</script>

<div class="row">
    <h5>{name}</h5>
</div>
<div class="row d-inline-flex">
    {#each Object.keys(checks) as key}
        <div
            class="m-1 p-0 w-min"
            style="
            height: 61px !important;
        "
        >
            <Checkbox
                bind:value="{checks[key].value}"
                bind:name="{key}"
                on:change="{e => {
                    d('change', {
                        key,
                        value: e.detail
                    });
                }}"
                bind:color
            ></Checkbox>
        </div>
    {/each}
</div>
