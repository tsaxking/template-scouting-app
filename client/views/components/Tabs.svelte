<script lang="ts">
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

export let tabs: string[] = [];
export let active: string = '';

const colors: string[] = ['secondary', 'success', 'secondary', 'warning'];
</script>

<ul class="nav nav-tabs nav-pills nav-fill">
    {#each tabs as tab, i}
        <li class="nav-item">
            <a
                class="nav-link {tab === active
                    ? `active bg-${colors[i]}`
                    : ''} p-3"
                href="javascript:void(0)"
                on:click="{() => dispatch('change', tab)}">{tab}</a
            >
        </li>
    {/each}
</ul>
