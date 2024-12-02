<script lang="ts">
import { type Blank, DataAction, PropertyAction } from "../../../../shared/struct";
    import { Permissions } from "../../../models/permissions";
    import { Struct } from "../../../models/struct";
import StructTable from "./StructTable.svelte";

    export let role: Permissions.RoleData;

    let structs: Permissions.StructPermissions<Blank>[] = [];

</script>

{#each structs as struct (struct.struct.name)}
    <StructTable {struct} />
{/each}