<script lang="ts">
    import { type Blank } from '../../../../shared/struct';
    import { Permissions } from '../../../models/permissions';

    export let property: Permissions.StructPermission<Blank>;
    export let structPermission: Permissions.StructPermissions<Blank>;
    let struct = structPermission.struct;

    let read = property.read;
    let update = property.update;

    const onChange = () => {
        structPermission.update(s => {
            const p = s.properties.find(p => p.property === property.property);
            if (p) {
                p.read = read;
                p.update = update;
                if (!read) {
                    p.update = false;
                }
            }

            return s;
        });
    };
</script>

<tr>
    <td>{property.property}</td>
    <td>
        <input
            id="{struct.name + ':' + property.property + '-read'}"
            name="{struct.name + ':' + property.property + '-read'}"
            type="checkbox"
            bind:checked="{read}"
            on:input="{event => {
                read = event.currentTarget.checked;
                onChange();
            }}"
        />
    </td>
    <td>
        <!-- It doesn't make sense to be able to update something you cannot read -->
        {#if read}
            <input
                id="{struct.name + ':' + property.property + '-update'}"
                name="{struct.name + ':' + property.property + '-update'}"
                type="checkbox"
                bind:checked="{update}"
                on:input="{event => {
                    update = event.currentTarget.checked;
                    onChange();
                }}"
            />
        {/if}
    </td>
</tr>
