<input class='w-100' placeholder="Scout Name" bind:value={name} on:change={() => sayName(name)}>

<script lang='ts'>
    let name;
    const sayName = (a: string) => {
        console.log(name)
    }
</script>