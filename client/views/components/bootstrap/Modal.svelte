<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
const dispatch = createEventDispatcher();
export let title: string;
export let message: string = '';
export let id: string = 'modal-' + Math.random().toString(36);

onMount(() => {
    jQuery(`#${id}`).on('hidden.bs.modal', () => {
        dispatch('hide');
    });

    jQuery(`#${id}`).on('shown.bs.modal', () => {
        dispatch('show');
    });

    document.querySelectorAll(`#${id} button.close-modal`).forEach(m => {
        jQuery(m).modal('hide');
    });
});

jQuery(`#${id}`).on('shown.bs.modal', () => {
    dispatch('show');
});

document.querySelectorAll(`#${id} button.close-modal`).forEach(m => {
    jQuery(m).modal('hide');
});
</script>

<div class="modal fade" tabindex="-1" aria-modal="true" role="dialog" {id}>
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{title}</h5>
                <button
                    type="button"
                    class="btn-close close-modal"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    on:click="{() => dispatch('hide')}"
                ></button>
            </div>
            <div class="modal-body">
                {#if message}
                    {message}
                {/if}
                <slot />
            </div>
            <div class="modal-footer">
                <button
                    type="button"
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                    on:click="{() => dispatch('close')}">Close</button
                >
                <slot name="buttons" />
            </div>
        </div>
    </div>
</div>
