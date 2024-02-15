<script lang='ts'>
    import { App } from '../../models/app/app';

    let name: string = App.scoutName;

    const fns = {
        save: (a: string) => {
            App.scoutName = a;
        }
    }

    $: fns.save(name);
</script>

<div class="form-floating">
    <input type="text" class="form-control" id="floatingInput" bind:value={name}>
    <label for="floatingInput">Scout Name</label>
</div>