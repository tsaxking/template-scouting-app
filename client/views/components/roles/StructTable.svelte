<script lang="ts">
import { type Blank } from "../../../../shared/struct";
    import { Permissions } from "../../../models/permissions";
import PropertyRow from "./PropertyRow.svelte";

    export let struct: Permissions.StructPermissions<Blank>;

    const s = $struct;
</script>


<h3>{struct.struct.name}</h3>
<!-- This is where the global checkmarks will go -->

<table class="table">
    <thead>
        <tr>
            <th>Property</th>
            <th>Read</th>
            <th>Update</th>
        </tr>
    </thead>
    <tbody>
        {#each s.properties as property (property.property)} 
            <PropertyRow {property} struct={struct.struct} />
        {/each}
    </tbody>
</table>