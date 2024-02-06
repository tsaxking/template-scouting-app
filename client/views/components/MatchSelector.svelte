<div class="btn-group w-100" role="group">
    <button type="button" class="btn btn-danger" on:click = {() => sayAction('previous match')}>
        <i class="material-icons">chevron_left</i>
        Previous Match
    </button>
    <button type="button" class="btn btn-success" on:click = {() => sayAction('playing the match')}>
        Play Match
        <i class="material-icons">play_arrow</i>
    </button>
    <button type="button" class="btn btn-primary" on:click = {() => sayAction('nexting the match')}>
        Next Match
        <i class="material-icons">chevron_right</i>
    </button>
</div>

<script lang='ts'>
    const sayAction = (action: string) => {
        console.log('You did ' + action)
    }

</script>