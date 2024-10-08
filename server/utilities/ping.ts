import { EventEmitter } from '../../shared/event-emitter';
import { ServerRequest } from './requests';
import { Result } from '../../shared/check';

/**
 * All events emitted by the pinger
 * @date 1/26/2024 - 2:07:32 PM
 *
 * @typedef {Events}
 */
type Events = {
    connect: void;
    disconnect: void;
    ping: Result<void>;
};

/**
 * Pings the server every 10 seconds or however long you specify
 * @param {number} [interval=10] Interval in seconds
 * @date 1/26/2024 - 2:07:32 PM
 * @returns {EventEmitter<keyof Events>}
 */
export const startPinger = (interval = 10) => {
    let status = 'disconnected';
    const pinger = new EventEmitter<Events>();

    const ping = async () => {
        const result = await ServerRequest.ping();
        if (result.isOk()) {
            if (status === 'disconnected') {
                pinger.emit('connect', undefined);
            }
            status = 'connected';
        } else {
            if (status === 'connected') {
                pinger.emit('disconnect', undefined);
            }
            status = 'disconnected';
        }

        pinger.emit('ping', result);
    };

    setTimeout(() => {
        ping();
        setInterval(ping, 1000 * interval);
    });

    return pinger;
};
