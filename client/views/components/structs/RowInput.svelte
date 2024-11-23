<script lang="ts">
    import {
        Blank,
        SQL_Type,
        TS_Type,
        checkStrType,
        returnType,
        type as tsTypeActual
    } from '../../../../shared/struct';
    import { Data } from '../../../models/struct';

    export let type: SQL_Type;
    export let data: TS_Type<SQL_Type>;
    export let header: string;
    export let onChange: (value: TS_Type<SQL_Type>) => void;

    // Svelete did not like the type being passed in as a prop for the boolean case
    let boolData: boolean;
    $: if (type === 'boolean') {
        boolData = data as boolean;
    }

// let tsType = tsTypeActual(type);
</script>

{#if type === 'text'}
    <input
        type="text"
        bind:value="{data}"
        on:change="{onChange}" />
{:else if type === 'integer'}
    <input
        step="1"
        type="number"
        bind:value="{data}"
        on:change="{onChange}" />
{:else if type === 'real'}
    <input
        step="0.0001"
        type="number"
        bind:value="{data}"
        on:change="{onChange}"
    />
{:else if type === 'boolean'}
    <input
        type="checkbox"
        bind:checked="{boolData}"
        on:change="{onChange}" />
    <!-- {:else if type === 'date'}
    <input type="date" bind:value={data} on:change={onChange} />
{:else if type === 'time'}
    <input type="time" bind:value={data} on:change={onChange} />
{:else if type === 'timestamp'}
    <input type="datetime-local" bind:value={data} on:change={onChange} />
{:else if type === 'enum'}
    <select bind:value={data} on:change={onChange}>
        {#each tsType as option (option)}
            <option value={option}>{option}</option>
        {/each}
    </select>
{:else if type === 'json'}
    <textarea bind:value={data} on:change={onChange}></textarea>
{:else} -->
    <input
        type="text"
        bind:value="{data}"
        on:change="{onChange}" />
{/if}

<!-- {#if checkStrType(type) === 'array'}
    <button on:click={() => data.push(returnType(type))}>Add</button>
    {#each data as item, i (item)}
        <RowInput type={type[0]} data={item} header={header} onChange={value => data[i] = value} />
    {/each}
{/if} -->
