<script lang="ts">
import { DataAction, PropertyAction } from "../../../../shared/struct";
    import { Permissions } from "../../../models/permissions";

    export let role: Permissions.RoleData;

    type S = {
        name: string;
        properties: {
            property: string; // unique
            update: boolean;
            read: boolean;
        }[];
        dataPermissions: DataAction[];
    };

    let structs: S[] = [];

</script>

{#each structs as s (s.name)}
    <h3>{s.name}</h3>
    <table class="table">
        <thead>
            <tr>
                <th>Property</th>
                <th>Read</th>
                <th>Update</th>
            </tr>
        </thead>
        <tbody>
            {#each s.properties as p (p.property)} 
                <tr>
                    <td>{p.property}</td>
                    <td>
                        <input 
                            id={s.name + ':' + p.property + '-read'}
                            name={s.name + ':' + p.property + '-read'} 
                            type="checkbox"
                            bind:value={p.read}
                        />
                    </td>
                    <td>
                        <!-- It doesn't make sense to be able to update something you cannot read -->
                        {#if p.read}
                            <input 
                                id={s.name + ':' + p.property + '-update'}
                                name={s.name + ':' + p.property + '-update'} 
                                type="checkbox" 
                            />
                        {/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/each}