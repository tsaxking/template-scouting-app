<script lang="ts">
import { Random } from '../../../../shared/math';
import { createEventDispatcher } from 'svelte';
import { capitalize, fromCamelCase } from '../../../../shared/text';
import type { BootstrapColor } from '../../../submodules/colors/color';
export let value: boolean = false;
export let name: string;
export let color: BootstrapColor;

let id = Random.uuid({
    charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
});

const dispatch = createEventDispatcher();

const onChange = () => {
    dispatch('change', value);
};
</script>

<input
    type="checkbox"
    class="btn-check"
    autocomplete="off"
    {id}
    bind:checked="{value}"
    on:change="{onChange}"
/>
<label class="btn btn-outline-{color}" for="{id}">
    {capitalize(fromCamelCase(name))}
</label>
