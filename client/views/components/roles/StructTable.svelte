<script lang="ts">
    import { type Blank } from '../../../../shared/struct';
    import { Permissions } from '../../../models/permissions';
    import PropertyRow from './PropertyRow.svelte';

    export let struct: Permissions.StructPermissions<Blank>;

    const selectRead = () => {
        struct.update(s => {
            const on = s.properties.every(p => p.data.read);
            if (on) {
                for (const property of s.properties) {
                    property.data.read = false;
                    property.data.update = false;
                }
            } else {
                for (const property of s.properties) {
                    property.data.read = true;
                }
            }

            return s;
        });
    };
    const selectUpdate = () => {
        struct.update(s => {
            const on = s.properties.every(p => p.update);
            if (on) {
                for (const property of s.properties) {
                    property.data.update = false;
                }
            } else {
                for (const property of s.properties) {
                    property.data.update = true;
                    property.data.read = true;
                }
            }

            return s;
        });
    };

    // let canCreate = $struct.permissions['create'];
    // let canDelete = $struct.permissions['delete'];

    // let canReadArchive = $struct.permissions['read-archive'];
    // let canArchive = $struct.permissions['archive'];
    // let canRestoreArchive = $struct.permissions['restore-archive'];

    // let canReadVersionHistory = $struct.permissions['read-version-history'];
    // let canRestoreVersion = $struct.permissions['restore-version'];
    // let canDeleteVersion = $struct.permissions['delete-version'];

    const onChange = () => {
        struct.update(s => {
            // if (!canCreate) canDelete = false;
            // if (!canReadArchive) {
            //     canArchive = false;
            //     canRestoreArchive = false;
            // }
            // if (!canReadVersionHistory) {
            //     canRestoreVersion = false;
            //     canDeleteVersion = false;
            // }

            // s.permissions = {
            //     create: canCreate,
            //     delete: canDelete,
            //     'read-archive': canReadArchive,
            //     archive: canArchive,
            //     'restore-archive': canRestoreArchive,
            //     'read-version-history': canReadVersionHistory,
            //     'restore-version': canRestoreVersion,
            //     'delete-version': canDeleteVersion
            // };
            // return s;

            return s;
        });
    };
</script>

<div class="container-fluid">
    <div class="row">
        <div class="form-check form-switch">
            <input
                id="{struct.struct.name}-create"
                class="form-check-input"
                role="switch"
                type="checkbox"
                bind:checked="{$struct.permissions['create']}"
                on:change="{onChange}"
            />
            <label
                class="form-check-label"
                for="{struct.struct.name}-create"
            >Create</label
            >
        </div>
    </div>
    {#if $struct.permissions['create']}
        <div class="row">
            <div class="form-check form-switch">
                <input
                    id="{struct.struct.name}-delete"
                    class="form-check-input"
                    role="switch"
                    type="checkbox"
                    bind:checked="{$struct.permissions['delete']}"
                    on:change="{onChange}"
                />
                <label
                    class="form-check label"
                    for="{struct.struct.name}-delete">Delete</label
                >
            </div>
        </div>
    {/if}
    <div class="row">
        <div class="form-check form-switch">
            <input
                id="{struct.struct.name}-read-archive"
                class="form-check-input"
                role="switch"
                type="checkbox"
                bind:checked="{$struct.permissions['read-archive']}"
                on:change="{onChange}"
            />
            <label
                class="form-check-label"
                for="{struct.struct.name}-read-archive">Read Archive</label
            >
        </div>
    </div>
    {#if $struct.permissions['read-archive']}
        <div class="row">
            <div class="form-check form-switch">
                <input
                    id="{struct.struct.name}-archive"
                    class="form-check-input"
                    role="switch"
                    type="checkbox"
                    bind:checked="{$struct.permissions['archive']}"
                    on:change="{onChange}"
                />
                <label
                    class="form-check-label"
                    for="{struct.struct.name}-archive">Archive</label
                >
            </div>
        </div>
        <div class="row">
            <div class="form-check form-switch">
                <input
                    id="{struct.struct.name}-restore-archive"
                    class="form-check-input"
                    role="switch"
                    type="checkbox"
                    bind:checked="{$struct.permissions['restore-archive']}"
                    on:change="{onChange}"
                />
                <label
                    class="form-check label"
                    for="{struct.struct.name}-restore-archive"
                >Restore Archive</label
                >
            </div>
        </div>
    {/if}
    <div class="row">
        <div class="form-check form-switch">
            <input
                id="{struct.struct.name}-read-version-history"
                class="form-check-input"
                role="switch"
                type="checkbox"
                bind:checked="{$struct.permissions['read-version-history']}"
                on:change="{onChange}"
            />
            <label
                class="form-check label"
                for="{struct.struct.name}-read-version-history"
            >Read Version History</label
            >
        </div>
    </div>
    {#if $struct.permissions['read-version-history']}
        <div class="row">
            <div class="form-check form-switch">
                <input
                    id="{struct.struct.name}-restore-version"
                    class="form-check-input"
                    role="switch"
                    type="checkbox"
                    bind:checked="{$struct.permissions['restore-version']}"
                    on:change="{onChange}"
                />
                <label
                    class="form-check-label"
                    for="{struct.struct.name}-restore-version"
                >Restore Version</label
                >
            </div>
        </div>
        <div class="row">
            <div class="form-check form-switch">
                <input
                    id="{struct.struct.name}-delete-version"
                    class="form-check-input"
                    role="switch"
                    type="checkbox"
                    bind:checked="{$struct.permissions['delete-version']}"
                    on:change="{onChange}"
                />
                <label
                    class="form-check label"
                    for="{struct.struct.name}-delete-version"
                >Delete Version</label
                >
            </div>
        </div>
    {/if}
    <div class="row">
        <table class="table">
            <thead>
                <tr>
                    <th>Property</th>
                    <th
                        class="cursor-pointer"
                        on:click="{selectRead}">
                        Read
                    </th>
                    <th
                        class="cursor-pointer"
                        on:click="{selectUpdate}">
                        Update
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each $struct.properties as property (property.data.property)}
                    <PropertyRow
                        bind:property="{property}"
                        structPermission="{struct}" />
                {/each}
            </tbody>
        </table>
    </div>
</div>
