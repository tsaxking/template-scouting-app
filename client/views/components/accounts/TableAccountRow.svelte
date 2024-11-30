<script lang="ts">
    import { SQL_Type, typeValidation } from '../../../../shared/struct';
    import { capitalize } from '../../../../shared/text';
    import { Accounts } from '../../../models/account';
    import { StructData } from '../../../models/struct';
    import ButtonGroup from '../bootstrap/ButtonGroup.svelte';
    import RowInput from '../structs/RowInput.svelte';
    import UniverseBadge from '../structs/UniverseBadge.svelte';

    export let account: Accounts.AccountData;

    const a = $account;

    const universeRes = account.getUniverses();
    let universes: string[] | undefined = [];

    universes = $universeRes || undefined;

    const onDataChange = (
        header: keyof typeof account.struct.data.structure,
        d: unknown
    ) => {
        const type = account.struct.data.structure[header];
        if (!typeValidation(type, d)) {
            console.error('Invalid type. Needs', type, 'but recieved', d);
            return;
        }

        account.update({
            [header]: d
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
    };

    const cantRead = '[Invalid Permissions]';
</script>

<tr>
    <td>
        {#if a.username !== undefined}
            <RowInput
                data="{a.username}"
                onChange="{d => {
                    onDataChange('username', d);
                }}"
                type="text"
            />
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        {#if a.firstName !== undefined}
            <RowInput
                data="{a.firstName}"
                onChange="{d => {
                    onDataChange('firstName', d);
                }}"
                type="text"
            />
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        {#if a.lastName !== undefined}
            <RowInput
                data="{a.lastName}"
                onChange="{d => {
                    onDataChange('lastName', d);
                }}"
                type="text"
            />
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        {#if a.email !== undefined}
            <RowInput
                data="{a.email}"
                onChange="{d => {
                    onDataChange('email', d);
                }}"
                type="text"
            />
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        <!-- TODO: Account picture change -->
        {#if a.picture !== undefined}
            <img
                alt="Cannot display Image"
                src="{a.picture}" />
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        {#if universes}
            {#if universes.length > 0}
                {#each universes as universe}
                    <UniverseBadge
                        {account}
                        {universe} />
                {/each}
            {:else}
                No Universes
            {/if}
            <!-- <span
                class="badge bg-primary me-1"
                data-placement="top"
                data-toggle="tooltip"
                title="Add Universe"
            >
                <i class="material-icons cursor-pointer text-sm"
                    on:click={addUniverse}
                >
                    add
                </i>
            </span> -->
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        {#if typeof a.verified === 'boolean'}
            {#if a.verified}
                <i class="material-icons bg-success">verified</i>
            {:else}
                <i class="material-icons bg-warning">warning</i>
            {/if}
        {:else}
            {cantRead}
        {/if}
    </td>
    <td>
        <ButtonGroup>
            <!-- <button class="btn btn-info">Add Universe</button> -->
            <button
                class="btn btn-danger"
                type="button">
                <i class="material-icons"> delete </i>
            </button>
            {#if a.verified}
                <button
                    class="btn btn-warning"
                    type="button">
                    <i class="material-icons"> warning </i>
                </button>
            {:else}
                <button
                    class="btn btn-success"
                    type="button">
                    <i class="material-icons"> verified </i>
                </button>
            {/if}
        </ButtonGroup>
    </td>
</tr>
