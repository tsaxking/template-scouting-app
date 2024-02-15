import { getEvent } from '../event-data.ts';
import { TBA } from '../../server/utilities/tba/tba.ts';
import { TBAEvent } from '../../shared/submodules/tatorscout-calculations/tba.ts';
import { select } from '../prompt.ts';
import { backToMain } from '../manager.ts';


const pullEvent = async () => {
    const allEvents = await TBA.get<TBAEvent[]>(`/team/frc2122/events/${new Date().getFullYear()}`);

    if (allEvents.isOk()) {
        const events = allEvents.value;
        if (!events) return backToMain('No events found');
        const event = await select('Select an event', events.map(e => ({
            name: e.name,
            value: e
        })));

        if (!event) return backToMain('No event selected');

        await getEvent(event.key);

        backToMain('Event pulled');
    } else {
        backToMain('Error pulling event');
    }
};





export const serverController = [
    {
        icon: '📅',
        value: pullEvent
    }
];
