<script lang="ts">
import { type Blank } from "../../../../shared/struct";
import { Permissions } from "../../../models/permissions";
import { Struct } from "../../../models/struct";

    export let property: Permissions.StructPermission<Blank>;
    export let struct: Struct<Blank>;
</script>

<tr>
    <td>{property.property}</td>
    <td>
        <input 
            id={struct.name + ':' + property.property + '-read'}
            name={struct.name + ':' + property.property + '-read'} 
            type="checkbox"
            bind:value={property.read}
        />
    </td>
    <td>
        <!-- It doesn't make sense to be able to update something you cannot read -->
        {#if property.read}
            <input 
                id={struct.name + ':' + property.property + '-update'}
                name={struct.name + ':' + property.property + '-update'} 
                type="checkbox" 
            />
        {/if}
    </td>
</tr>