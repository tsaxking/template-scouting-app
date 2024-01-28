<script lang="ts">
    import { App } from '../../../models/app/app';
    import type { Section } from '../../../models/app/app';
    import type { BootstrapColor } from '../../../submodules/colors/color';
    export let app: App;

    let currentSection: Section = 'auto';

    const sections: {
        [key in Section]: [BootstrapColor, BootstrapColor];
    } = {
        auto: ['success', 'light'],
        teleop: ['primary', 'light'],
        endgame: ['warning', 'dark'],
        end: ['danger', 'light'],
    };

    let time = 0;

    app.on('section', (s) => {
        currentSection = s;
    });
    app.on('tick', (t) => {
        time = t.second;
    });
    app.on('end', () => {
        currentSection = 'end';
    });

    const setSection = (section: string) => {
        currentSection = section as Section;
        app.changeSection(section as Section);
    }

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
</script>

<div class="timer position-absolute bg-dark rounded">
    {#each Object.entries(sections) as [section, [color]]}
        {#if section === currentSection}
            <button class="btn btn-{color}" on:click={() => setSection(section)}>{section}</button>
        {:else}
            <button class="btn btn-outline-{color}" on:click={() => setSection(section)}>{section}</button>
        {/if}
    {/each}
    {#each Object.entries(sections) as [section, [color, text]]}
        {#if section === currentSection}
            <div class="position-relative">
                <div class="progress position-relative w-100">
                    <div class="progress-bar progress-bar-striped bg-{color}" role="progressbar" style="width: {time / 150 * 100}%" aria-valuenow={time} aria-valuemin="0" aria-valuemax="150"></div>
                    <div class="position-absolute w-100 text-center text-{text}">{formatTime(time)}</div>
                </div>
            </div>
        {/if}
    {/each}
</div>

<style>
    .timer {
        z-index: 999;
    }
</style>