import { getEvent } from '../event-data.ts';
import { TBA } from '../../server/utilities/tba/tba.ts';
import { TBAEvent } from '../../shared/submodules/tatorscout-calculations/tba.ts';
import { select } from '../prompt.ts';
import { backToMain } from '../manager.ts';
import { ServerRequest } from '../../server/utilities/requests.ts';
import env from '../../server/utilities/env.ts';

const pullEvent = async () => {
    const years = Array.from({ length: new Date().getFullYear() - 2006 })
        .map((_, i) => i + 2007)
        .reverse();

    const year = await select(
        'Select a year',
        years.map((y) => ({
            name: y.toString(),
            value: y,
        })),
    );

    if (!year) return backToMain('No year selected');

    const allEvents = await TBA.get<TBAEvent[]>(`/team/frc2122/events/${year}`);

    if (allEvents.isOk()) {
        const events = allEvents.value;
        if (!events) return backToMain('No events found');
        const event = await select(
            'Select an event',
            events.map((e) => ({
                name: e.name,
                value: e,
            })),
        );

        if (!event) return backToMain('No event selected');

        const res = await getEvent(event.key);

        if (res.isOk()) {
            return backToMain('Event pulled');
        } else {
            console.error(res.error);
            backToMain('Error pulling event');
        }
    } else {
        console.error(allEvents.error);
        backToMain('Error pulling event');
    }
};

const viewServerConnection = async () => {
    const ping = await ServerRequest.ping();
    if (ping.isOk()) {
        backToMain('Server is connected');
    } else {
        backToMain(
            'Server is not connected' + (ping.error ? `: ${ping.error}` : ''),
        );
    }
};

export const serverController = [
    {
        icon: '📅',
        value: pullEvent,
        description: 'Pull an event from TBA, and make it the current event.',
    },
    {
        icon: '🔗',
        value: viewServerConnection,
        description: `View connection with ${env.SERVER_DOMAIN}`,
    },
];
