<script lang="ts">
    import { loadFileContents } from "../../utilities/downloads";
    import { App } from "../../models/app/app";
    import type { Match } from "../../../shared/submodules/tatorscout-calculations/match-submission";

    const validate = (d: string): boolean => {
        if (!d) return false;
        try {
            const data = JSON.parse(d) as Match;
            if (!data) return false;
            if (typeof data.matchNumber !== 'number') return false;
            if (typeof data.teamNumber !== 'number') return false;
            if (typeof data.group !== 'number') return false;
            if (typeof data.scout !== 'string') return false;
            if (typeof data.date !== 'number') return false;
            if (!Array.isArray(data.trace)) return false;
            if (['pr', 'qm', 'qf', 'sf', 'f'].indexOf(data.compLevel) === -1) return false;
            if (typeof data.eventKey !== 'string') return false;
            if (!Array.isArray(data.checks)) return false;
            if (typeof data.comments !== 'object') return false;
        } catch {
            return false;
        }
        return true;
    }

    const upload = async () => {
        const result = await loadFileContents();
        console.log(result);
        if (result.isOk()) {
            App.upload(...result.value.map(({ text }) => {
                if (!validate(text)) {
                    return false;
                }
                return JSON.parse(text);
            }).filter(Boolean));
        }
    }
</script>

<button class="btn btn-success w-100" on:click={upload}>Upload matches</button>