<script lang="ts">
    import { Permissions } from '../../../models/permissions';
    import RoleEditor from './RoleEditor.svelte';
    import Modal from '../bootstrap/Modal.svelte';

    const rolesStore = Permissions.Role.all(true);

    const roles = $rolesStore;

    let selected: Permissions.RoleData | null = null;
    let showEditor = false;
    $: showEditor = !!selected;
</script>

<table class="table table-hover">
    <thead>
        <tr>
            <th>Role</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        {#each roles as role (role.id)}
            <tr
                on:click="{() => {
                    selected = role;
                }}"
            >
                <td>{role.data.name}</td>
                <td>{role.data.description}</td>
            </tr>
        {/each}
    </tbody>
</table>

{#if selected}
    <Modal
        title="{'Role: ' + selected.data.name}"
        bind:show="{showEditor}">
        <RoleEditor role="{selected}" />
    </Modal>
{/if}
