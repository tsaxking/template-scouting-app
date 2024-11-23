<script lang="ts">
    import { onMount } from 'svelte';
    import { Blank } from '../../../../shared/struct';
    import { Struct } from '../../../models/struct';
    import Row from './Row.svelte';
    import jQuery from 'jquery';

    export let current: Struct<Blank>;

    const headers = Object.keys(current.data.structure);

    const allStore = current.all();
    const all = $allStore;

    let table: HTMLTableElement;

    onMount(() => {
        // TODO: is this good?
    // I don't know if it will work with editable cells
    // are there other packages that would be better?
        jQuery(table).dataTable();
    });
</script>

<table bind:this="{table}">
    <thead>
        <tr>
            {#each headers as header (header)}
                <th>{header}</th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each all as row (row.id)}
            <Row
                {headers}
                bind:data="{row}" />
        {/each}
    </tbody>
</table>
