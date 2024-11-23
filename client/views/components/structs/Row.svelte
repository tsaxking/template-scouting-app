<script lang="ts">
    import { Blank, typeValidation } from '../../../../shared/struct';
    import { Data } from '../../../models/struct';
    import RowInput from './RowInput.svelte';

    export let data: Data<Blank>;
    export let headers: string[];

    const d = $data;

    const onDataChange = (header: string, value: unknown) => {
        const type = data.struct.data.structure[header];
        if (typeValidation(type, value)) {
            console.error('Invalid type');
            return;
        }

        // I feel okay using any because I proved that it's valid above
        data.update({
            [header]: value
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
    };
</script>

<tr>
    {#each headers as header (header)}
        {#if d[header]}
            <td>
                <RowInput
                    data="{d[header]}"
                    {header}
                    onChange="{d => {
                        onDataChange(header, d);
                    }}"
                    type="{data.struct.data.structure[header]}"
                />
            </td>
        {:else}
            <!-- User does not have access to this -->
            <td class="bg-secondary">[No Access]</td>
        {/if}
    {/each}
</tr>
