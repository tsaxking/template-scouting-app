<script lang="ts">
    import { comments } from '../../models/app/comments';
    import { createEventDispatcher } from 'svelte';
    const d = createEventDispatcher();

    type T = 'auto' | 'tele' | 'end';
    type Y = 2025;

    export let type: T;
    export let year: Y;

    let availableComments: string[] = [];
    export let selected: string[] = [];

    const fns = {
        getComments: (type: T, year: Y) => {
            const general = comments.general[type];
            const yearComments = comments[year][type];

            if (general && yearComments) {
                availableComments = [...general, ...yearComments];
            } else {
                availableComments = general || yearComments || [];
            }
        }
    };

    $: fns.getComments(type, year);
    $: d('comments', selected);
</script>

<!-- Checkboxes -->
{#each availableComments as comment}
    <div class="form-check">
        <input
            id="{comment}"
            class="form-check-input"
            checked="{selected.includes(comment)}"
            type="checkbox"
            value="{comment}"
            bind:group="{selected}"
        />
        <label
            class="form-check-label"
            for="{comment}">{comment}</label>
    </div>
{/each}
