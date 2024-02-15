<script lang='ts'>
    const fns = {
        next: () => {
            console.log('next');
        },
        prev: () => {
            console.log('previous');
        },
        play: () => {
            console.log('play');
        }
    }
</script>



<div class="btn-group w-100" role="group">
    <button type="button" class="btn btn-danger" on:click = {fns.prev}>
        <i class="material-icons">chevron_left</i>
        Previous Match
    </button>
    <button type="button" class="btn btn-success" on:click = {fns.play}>
        Play Match
        <i class="material-icons">play_arrow</i>
    </button>
    <button type="button" class="btn btn-primary" on:click = {fns.next}>
        Next Match
        <i class="material-icons">chevron_right</i>
    </button>
</div>