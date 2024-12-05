<script lang="ts">
    import { type SType, testStruct } from "../../../entries/test/struct-testing";

    export let data: SType;
    export let onRemove: (data: SType) => void;

    console.log(data);
    console.log($data);
</script>

<div>
    <p>{$data.age} - {$data.name}</p>
    <button
        class="btn btn-danger"
        type="button"
        on:click={() => onRemove(data)}
    >
        Remove
    </button>
</div>