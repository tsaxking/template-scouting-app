<script lang="ts">
    import { dateTime } from '../../../../shared/clock';
    import { type Blank, typeValidation } from '../../../../shared/struct';
    import { Data, Struct } from '../../../models/struct';
    import RowInput from './RowInput.svelte';

    export let data: Data<Struct<Blank>>;
    export let headers: string[];

    const d = $data;

    const onDataChange = (header: string, value: unknown) => {
        const type = data.struct.data.structure[header];
        if (typeValidation(type, value)) {
            console.error(`Invalid type. Needs [${type}] but recieved ${value}`);
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
    <td>
        {dateTime(new Date(String(d.created)))}
    </td>
    <td>
        {dateTime(new Date(String(d.created)))}
    </td>
    <!-- Universes -->
    <!-- Attributes -->
    <td>
        {#if typeof d.lifetime !== 'undefined'}
            <RowInput
                data="{d.lifetime}"
                onChange="{d => {
                    onDataChange('lifetime', d);
                }}"
                type="integer"
            />
        {/if}
    </td>
    <td>
        {#if typeof d.archived !== 'undefined'}
            <RowInput
                data="{d.archived}"
                onChange="{d => {
                    data.setArchive(!!d);
                }}"
                type="boolean"
            />
        {/if}
    </td>
</tr>
