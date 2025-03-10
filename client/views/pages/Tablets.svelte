<script lang="ts">
    import { Tablet, State } from '../../models/admin';
    import { onMount } from 'svelte';
    import { ServerRequest } from '../../utilities/requests';
    import { confirm } from '../../utilities/notifications';
    import type { TabletState } from '../../models/admin';
    import ServerStats from '../components/ServerStats.svelte';

    let tablets: Tablet[] = [];
    let accounts: string[] = [];

    const sort = (a: Tablet, b: Tablet) =>
        a.state.groupNumber - b.state.groupNumber;

    const newTablet = (tablet: Tablet) => {
        tablets = [...tablets, tablet].sort(sort);
        tablet.on('update', changeTabletState);
        tablet.on('destroy', deleteTablet);
    };
    const deleteTablet = (tablet: Tablet) => {
        tablet.off('destroy', deleteTablet);
        tablet.off('update', changeTabletState);
        tablets = tablets.filter(t => t.id !== tablet.id).sort(sort);
    };
    const changeTabletState = () => (tablets = tablets.sort(sort));

    const init = () => {
        State.pullState().then(s => {
            if (s.isErr()) return console.error(s);
            tablets = s.value.sort(sort);

            for (const t of tablets) {
                t.on('update', changeTabletState);
                t.on('destroy', deleteTablet);
            }
        });

        State.on('new-tablet', newTablet);

        ServerRequest.post<string[]>('/get-accounts').then(res => {
            if (res.isOk()) {
                accounts = res.value;
            }
        });
    };

    onMount(() => {
        init();
        return () => {
            for (const t of tablets) {
                t.off('destroy', deleteTablet);
                t.off('update', changeTabletState);
            }
            State.off('new-tablet', newTablet);
            tablets = [];
            accounts = [];
        };
    });

    State.on('refresh', init);

    const check = (tablet: Tablet) => {
        const old = tablet.state;
        const state = tablet.abstracted;
        return confirm(
            `
Are you sure you want to submit the following data?
Group: ${old.groupNumber} -> ${state.groupNumber}
Scout: ${old.scoutName} -> ${state.scoutName}
Match: ${old.matchNumber} ${state.matchNumber}
Level: ${old.compLevel} -> ${state.compLevel}
Team: ${old.teamNumber} -> ${state.teamNumber}
Prescouting: ${old.preScouting} -> ${state.preScouting}
`.trim()
        );
    };

    const submitAll = async () => {
        const doThis = await confirm(
            'Are you sure you want to force submit all tablets?'
        );
        if (!doThis) return;
        for (const t of tablets) {
            t.submit();
        }
    };
</script>

<div class="container">
    <div class="row">
        <button
            class="btn btn-primary"
            on:click="{submitAll}">
            Force Submit All
        </button>

        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th> Group </th>
                        <th> Scout </th>
                        <th> Match </th>
                        <th> Level </th>
                        <th> Team </th>
                        <th> Prescouting </th>
                        <th> Actions </th>
                    </tr>
                </thead>
                <tbody>
                    {#each tablets as t (t.id)}
                        <tr>
                            <!-- Group -->
                            <td>
                                <input
                                    id="tablet-num-{t.id}"
                                    name="tablet-num-{t.id}"
                                    class="form-control"
                                    type="number"
                                    bind:value="{t.abstractedGroup}"
                                />
                            </td>
                            <!-- Scout name -->
                            <td>
                                <input
                                    id="tablet-scout-{t.id}"
                                    name="tablet-scout-{t.id}"
                                    class="form-control"
                                    list="accounts-{t.id}"
                                    type="text"
                                    bind:value="{t.abstracted.scoutName}"
                                />
                                <datalist id="accounts-{t.id}">
                                    {#each accounts as account}
                                        <option value="{account}" />
                                    {/each}
                                </datalist>
                            </td>
                            <!-- Match number -->
                            <td>
                                <input
                                    id="tablet-match-{t.id}"
                                    name="tablet-match-{t.id}"
                                    class="form-control"
                                    type="number"
                                    bind:value="{t.abstracted.matchNumber}"
                                />
                            </td>
                            <!-- Comp Level -->
                            <td>
                                <select
                                    id="tablet-level-{t.id}"
                                    name="tablet-level-{t.id}"
                                    class="form-control"
                                    bind:value="{t.abstracted.compLevel}"
                                >
                                    <option value="pr">Practice</option>
                                    <option value="qm">Qualification</option>
                                    <option value="qf">Quarterfinal</option>
                                    <option value="sf">Semifinal</option>
                                    <option value="f">Final</option>
                                </select>
                            </td>
                            <!-- Team Number -->
                            <td>
                                <input
                                    id="tablet-team-{t.id}"
                                    name="tablet-team-{t.id}"
                                    class="form-control"
                                    type="number"
                                    bind:value="{t.abstracted.teamNumber}"
                                />
                            </td>
                            <!-- PreScouting -->
                            <td>
                                <input
                                    id="btn-check"
                                    class="btn-check"
                                    autocomplete="off"
                                    type="checkbox"
                                    bind:checked="{t.abstracted.preScouting}"
                                />
                                <label
                                    class="btn btn-primary"
                                    for="btn-check"
                                >pre-scout</label
                                >
                            </td>
                            <td>
                                <div
                                    class="btn-group"
                                    role="group">
                                    <button
                                        class="btn btn-primary"
                                        type="button"
                                        on:click="{async () => {
                                            const doSubmit = await check(t);
                                            if (!doSubmit) return;
                                            t.changeState(t.abstracted);
                                        }}"
                                    >
                                        Emit Changes
                                    </button>
                                    <button
                                        class="btn btn-warning"
                                        type="button"
                                        on:click="{() => {
                                            t.reset();
                                            tablets = tablets; // view update
                                        }}"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        class="btn btn-danger"
                                        type="button"
                                        on:click="{async () => {
                                            const cancel = await confirm(
                                                'Are you sure you want to abort this tablet?'
                                            );
                                            if (!cancel) return;
                                            t.abort();
                                        }}"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        class="btn btn-success"
                                        type="button"
                                        on:click="{async () => {
                                            const submit = await confirm(
                                                'Are you sure you want to force submit on this tablet?'
                                            );
                                            if (!submit) return;
                                            t.submit();
                                        }}"
                                    >
                                        Force Submit
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
    <div class="row">
        <ServerStats />
    </div>
</div>
