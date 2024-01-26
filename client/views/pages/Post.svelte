<script lang="ts">
    import { onMount } from 'svelte';
    import { App } from '../../models/app/app';
    import Checkboxes from '../components/app/Checkboxes.svelte';
    import type { BootstrapColor } from '../../submodules/colors/color';
import Page from '../components/main/Page.svelte';

    export let app: App;
    export let active: string;
    let canvas: HTMLCanvasElement;

    type PostData = {
        value: boolean;
        color: BootstrapColor;
    }


    let data: {
        [key: string]: PostData;
    } = {
        autoMobility: {
            value: false,
            color: 'success'
        },
        parked: {
            value: false,
            color: 'success'
        },
        playedDefense: {
            value: false,
            color: 'primary'
        },
        tippy: {
            value: false,
            color: 'warning'
        },
        easilyDefended: {
            value: false,
            color: 'warning'
        },
        robotDied: {
            value: false,
            color: 'danger'
        },
        problemsDriving: {
            value: false,
            color: 'danger'
        }
    }
    
    const open = (active) => {
        if (active !== 'Post') return;
        console.log('Post opened');
        app.drawRecap(canvas);

        data.autoMobility.value = app.parsed.mobility;
        data = data;
    };
    $: {
        open(active);
    }

</script>

<div class="container">
    <div class="container">
        <div class="row d-flex justify-content-center w-100 p-0">
            <Checkboxes bind:data={data} />
        </div>
        <div class="row">
            <button class="btn btn-success btn-lg w-100" on:click={() => app.submit({
                checks: Object.entries(data).map(([key, value]) => value ? key : null).filter(Boolean),
                comments: {
                    defensive: '',
                    tippy: '',
                    easilyDefended: '',
                    robotDied: '',
                    problemsDriving: ''
                }
            })}>Submit Match</button>
        </div>
        <div class="row p-0 m-0">
            <canvas bind:this={canvas}></canvas>
        </div>
    </div>

</div>