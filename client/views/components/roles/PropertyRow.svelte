<script lang="ts">
    import { type Blank } from '../../../../shared/struct';
    import { Permissions } from '../../../models/permissions';

    export let property: Permissions.StructProperty<Blank>;
    export let structPermission: Permissions.StructPermissions<Blank>;
    let struct = structPermission.struct;

    // let read = property.data.read;
    // let update = property.data.update;

    const onChange = () => {
        structPermission.update(s => {
            const p = s.properties.find(p => p.data.property === $property.property);
            if (p) {
                p.data.read = $property.read;
                p.data.update = $property.update;
                if (!$property.read) {
                    p.data.update = false;
                }
            }

            return s;
        });
    };
</script>

<tr>
    <td>{$property.property}</td>
    <td>
        <div class="form-check form-switch">
            <input
                id="{struct.name + ':' + $property.property + '-read'}"
                name="{struct.name + ':' + $property.property + '-read'}"
                class="form-check-input"
                role="switch"
                type="checkbox"
                bind:checked="{$property.read}"
                on:input="{event => {
                    $property.read = event.currentTarget.checked;
                    onChange();
                }}"
            />
        </div>
        <!-- <label for="{struct.name + ':' + property.property + '-read'}"></label> -->
    </td>
    <td>
        <!-- It doesn't make sense to be able to update something you cannot read -->
        {#if $property.read}
            <div class="form-check form-switch">
                <input
                    id="{struct.name + ':' + $property.property + '-update'}"
                    name="{struct.name + ':' + $property.property + '-update'}"
                    class="form-check-input"
                    role="switch"
                    type="checkbox"
                    bind:checked="{$property.update}"
                    on:input="{event => {
                        $property.update = event.currentTarget.checked;
                        onChange();
                    }}"
                />
            </div>
        {/if}
    </td>
</tr>
