<script lang="ts">
    import { Tablet, State } from '../../models/admin';
    import { onMount } from 'svelte';
import { ServerRequest } from '../../utilities/requests';

    let tablets: Tablet[] = [];
    let accounts: string[] = [];

    const sort = (a: Tablet, b: Tablet) => a.state.groupNumber - b.state.groupNumber;

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
    const changeTabletState = () => tablets = tablets.sort(sort);

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

        ServerRequest.post<string[]>('/get-accounts').then((res) => {
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
        }
    });

</script>
<div class="table-responsive">
    <table class="table table-striped table-hover">
        <thead>
            <tr>
                <th>
                    Group
                </th>
                <th>
                    Scout
                </th>
                <th>
                    Match
                </th>
                <th>
                    Level
                </th>
                <th>
                    Team
                </th>
                <th>
                    Prescouting
                </th>
                <th>
                    Actions
                </th>
            </tr>
        </thead>
        <tbody>
            {#each tablets as t}
                <tr>
                    <td>
                        <input type="number" name="tablet-num-{t.id}" id="tablet-num-{t.id}" value="{t.state.groupNumber}" on:change="{(e) => {
                            const num = parseInt((e.currentTarget).value);
                            if (isNaN(num)) return e.currentTarget.value = t.state.groupNumber.toString();
                            if (t.state.groupNumber === num) return e.currentTarget.value = t.state.groupNumber.toString();
                            t.changeState({
                                groupNumber: num
                            });
                        }}">
                    </td>
                    <td>
                        <input type="text" list="accounts-{t.id}" name="tablet-scout-{t.id}" id="tablet-scout-{t.id}" value="{t.state.scoutName}" on:change="{(e) => {
                            const name = e.currentTarget.value;
                            if (t.state.scoutName === name) return e.currentTarget.value = t.state.scoutName;
                            t.changeState({
                                scoutName: name
                            });
                        }}">
                        <datalist id="accounts-{t.id}">
                            {#each accounts as account}
                                <option value="{account}" />
                            {/each}
                        </datalist>
                    </td>
                    <td>
                        <input type="number" name="tablet-match-{t.id}" id="tablet-match-{t.id}" value="{t.state.matchNumber}" on:change="{(e) => {
                            const num = parseInt(e.currentTarget.value);
                            if (isNaN(num)) return e.currentTarget.value = t.state.matchNumber.toString();
                            if (t.state.matchNumber === num) return e.currentTarget.value = t.state.matchNumber.toString();
                            t.changeState({
                                matchNumber: num
                            });
                        }}">
                    </td>
                    <td>
                        <select name="tablet-level-{t.id}" id="tablet-level-{t.id}" value="{t.state.compLevel}" on:change="{(e) => {
                            const level = e.currentTarget.value;
                            if (t.state.compLevel === level) return e.currentTarget.value = t.state.compLevel;
                            t.changeState({
                                compLevel: level
                            });
                        }}">
                            <option value="pr">Practice</option>
                            <option value="qm">Qualification</option>
                            <option value="qf">Quarterfinal</option>
                            <option value="sf">Semifinal</option>
                            <option value="f">Final</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" name="tablet-team-{t.id}" id="tablet-team-{t.id}" value="{t.state.teamNumber}" on:change="{(e) => {
                            const num = parseInt(e.currentTarget.value);
                            if (isNaN(num)) return e.currentTarget.value = t.state.teamNumber.toString();
                            if (t.state.teamNumber === num) return e.currentTarget.value = t.state.teamNumber.toString();
                            t.changeState({
                                teamNumber: num
                            });
                        }}">
                    </td>
                    <td>
                        <div role="group" class="btn-group">
                            <button class="btn btn-danger" on:click={() => t.abort()}>
                                <i class="material-icons">close</i>
                            </button>
                            <button class="btn btn-success" on:click={() => t.submit()}>
                                <i class="material-icons">check</i>
                            </button>
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>