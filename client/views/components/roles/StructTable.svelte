<script lang="ts">
    import { type Blank } from '../../../../shared/struct';
    import { Permissions } from '../../../models/permissions';
    import PropertyRow from './PropertyRow.svelte';

    export let struct: Permissions.StructPermissions<Blank>;

    const s = $struct;

    const selectRead = () => {
        struct.update(s => {
            const on = s.properties.every(p => p.read);
            if (on) {
                for (const property of s.properties) {
                    property.read = false;
                    property.update = false;
                }
            } else {
                for (const property of s.properties) {
                    property.read = true;
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
                    property.update = false;
                }
            } else {
                for (const property of s.properties) {
                    property.update = true;
                    property.read = true;
                }
            }

            return s;
        });
    };
</script>

<h3>{struct.struct.name}</h3>
<!-- This is where the global checkmarks will go -->

<table class="table">
    <thead>
        <tr>
            <th>Property</th>
            <th
                class="cursor-pointer"
                on:click="{selectRead}"> Read </th>
            <th
                class="cursor-pointer"
                on:click="{selectUpdate}"> Update </th>
        </tr>
    </thead>
    <tbody>
        {#each s.properties as property (property.property)}
            <PropertyRow
                {property}
                structPermission="{struct}" />
        {/each}
    </tbody>
</table>
