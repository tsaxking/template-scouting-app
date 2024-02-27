import { saveJSON } from '../server/utilities/files.ts';
import { ServerRequest } from '../server/utilities/requests.ts';
import { attemptAsync } from '../shared/check.ts';

export const getEvent = async (eventKey: string) => {
    return attemptAsync(async () => {
        const eventKeyRegex = /^[0-9]{4}[a-z0-9]{4}$/i;
        if (!eventKeyRegex.test(eventKey)) {
            console.error('Invalid event key');
            Deno.exit(1);
        }

        const result = await ServerRequest.getEventData(eventKey);
        console.log(result);

        if (result.isOk()) {
            const jsonRes = await saveJSON('event-data.json', result.value);

            if (jsonRes.isOk()) {
                console.log('Saved event data to event-data.json');
            }
        }
    });
};

if (import.meta.main) getEvent(Deno.args[0]);
