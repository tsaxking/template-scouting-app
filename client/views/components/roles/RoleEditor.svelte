<script lang="ts">
    import {
        type Blank,
        DataAction,
        PropertyAction
    } from '../../../../shared/struct';
    import { Permissions } from '../../../models/permissions';
    import { Struct } from '../../../models/struct';
    import StructTable from './StructTable.svelte';

    export let role: Permissions.RoleData;

    let structs: Permissions.StructPermissions<Blank>[] = [];
</script>

<div class="container">
    {#each structs as struct (struct.struct.name)}
        <div class="row">
            <StructTable {struct} />
        </div>
    {/each}
    <div class="row">
        <div class="d-flex flex-reverse">
            <button
                class="btn btn-primary"
                type="button"
                on:click="{() => {
                    Permissions.StructPermissions.save(structs);
                }}">Save</button
            >
            <button
                class="btn btn-secondary"
                type="button"
                on:click="{() => {
                    for (const s of structs) s.reset();
                }}">Cancel</button
            >
        </div>
    </div>
</div>
