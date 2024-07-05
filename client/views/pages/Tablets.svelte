<script lang="ts">
import { Tablet, State } from '../../models/admin';
import { onMount } from 'svelte';
import { ServerRequest } from '../../utilities/requests';
import { confirm } from '../../utilities/notifications';
import type { TabletState } from '../../models/admin';

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

onMount(() => {
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

const check = (tablet: Tablet, state: TabletState) => {
    const old = tablet.state;
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
</script>

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
            {#each tablets as t}
                <tr>
                    <!-- Group -->
                    <td>
                        <input
                            type="number"
                            name="tablet-num-{t.id}"
                            id="tablet-num-{t.id}"
                            value="{t.state.groupNumber}"
                            class="form-control"
                            on:change="{async e => {
                                const num = parseInt(e.currentTarget.value);
                                if (isNaN(num))
                                    return (e.currentTarget.value =
                                        t.state.groupNumber.toString());
                                if (t.state.groupNumber === num)
                                    return (e.currentTarget.value =
                                        t.state.groupNumber.toString());

                                const doSubmit = await check(t, {
                                    ...t.state,
                                    groupNumber: num
                                });

                                if (!doSubmit) return;

                                t.changeState({
                                    groupNumber: num
                                });
                            }}"
                        />
                    </td>
                    <!-- Scout name -->
                    <td>
                        <input
                            type="text"
                            list="accounts-{t.id}"
                            name="tablet-scout-{t.id}"
                            id="tablet-scout-{t.id}"
                            class="form-control"
                            value="{t.state.scoutName}"
                            on:change="{async e => {
                                const name = e.currentTarget.value;
                                if (t.state.scoutName === name)
                                    return (e.currentTarget.value =
                                        t.state.scoutName);

                                const doSubmit = await check(t, {
                                    ...t.state,
                                    scoutName: name
                                });

                                if (!doSubmit) return;
                                t.changeState({
                                    scoutName: name
                                });
                            }}"
                        />
                        <datalist id="accounts-{t.id}">
                            {#each accounts as account}
                                <option value="{account}"></option>
                            {/each}
                        </datalist>
                    </td>
                    <!-- Match number -->
                    <td>
                        <input
                            type="number"
                            name="tablet-match-{t.id}"
                            id="tablet-match-{t.id}"
                            class="form-control"
                            value="{t.state.matchNumber}"
                            on:change="{async e => {
                                const num = parseInt(e.currentTarget.value);
                                if (isNaN(num))
                                    return (e.currentTarget.value =
                                        t.state.matchNumber.toString());
                                if (t.state.matchNumber === num)
                                    return (e.currentTarget.value =
                                        t.state.matchNumber.toString());

                                const doSubmit = await check(t, {
                                    ...t.state,
                                    matchNumber: num
                                });

                                if (!doSubmit) return;
                                t.changeState({
                                    matchNumber: num
                                });
                            }}"
                        />
                    </td>
                    <!-- Comp Level -->
                    <td>
                        <select
                            name="tablet-level-{t.id}"
                            id="tablet-level-{t.id}"
                            class="form-control"
                            value="{t.state.compLevel}"
                            on:change="{async e => {
                                const level = e.currentTarget.value;
                                if (t.state.compLevel === level)
                                    return (e.currentTarget.value =
                                        t.state.compLevel);

                                const doSubmit = await check(t, {
                                    ...t.state,
                                    compLevel: level
                                });

                                if (!doSubmit) return;
                                t.changeState({
                                    compLevel: level
                                });
                            }}"
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
                            type="number"
                            name="tablet-team-{t.id}"
                            class="form-control"
                            id="tablet-team-{t.id}"
                            value="{t.state.teamNumber}"
                            on:change="{async e => {
                                const num = parseInt(e.currentTarget.value);
                                if (isNaN(num))
                                    return (e.currentTarget.value =
                                        t.state.teamNumber.toString());
                                if (t.state.teamNumber === num)
                                    return (e.currentTarget.value =
                                        t.state.teamNumber.toString());

                                const doSubmit = await check(t, {
                                    ...t.state,
                                    teamNumber: num
                                });

                                if (!doSubmit) return;
                                t.changeState({
                                    teamNumber: num
                                });
                            }}"
                        />
                    </td>
                    <!-- PreScouting -->
                    <td>
                        <input
                            type="checkbox"
                            name="tablet-prescouting-{t.id}"
                            id="tablet-prescouting-{t.id}"
                            class="form-control"
                            checked="{t.state.preScouting}"
                            on:change="{async e => {
                                const doSubmit = await check(t, {
                                    ...t.state,
                                    preScouting: e.currentTarget.checked
                                });

                                if (!doSubmit) return;
                                t.changeState({
                                    preScouting: e.currentTarget.checked
                                });
                            }}"
                        />
                    </td>
                    <td>
                        <div role="group" class="btn-group">
                            <button
                                class="btn btn-danger"
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
                                on:click="{async () => {
                                    const submit = await confirm(
                                        'Are you sure you want to force submit on this tablet?'
                                    );
                                    if (!submit) return;
                                    t.submit();
                                }}"
                                title="This will force the tablet to submit the match. This is not to be used to change any of the actual data"
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
