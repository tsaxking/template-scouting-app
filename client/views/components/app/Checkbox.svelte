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
  {id}
  class="btn-check btn-small"
  autocomplete="off"
  type="checkbox"
  bind:checked="{value}"
  on:change="{onChange}"
/>
<label
  class="btn btn-outline-{color} label"
  for="{id}">
  {capitalize(fromCamelCase(name))}
</label>

<style>
.label {
    box-sizing: border-box;
    height: 100% !important;
    width: 100px !important;
    text-align: center;
    vertical-align: middle;
}
</style>
