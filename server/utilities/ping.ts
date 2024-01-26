import { EventEmitter } from '../../shared/event-emitter.ts';
import { ServerRequest } from './requests.ts';
import { Result } from '../../shared/attempt.ts';

type Events = {
    'connect': void;
    'disconnect': void;
    'ping': Result<void>;
}

export const startPinger = () => {
    let status = 'disconnected';
    const pinger = new EventEmitter<keyof Events>();

    const ping = async () => {
        const result = await ServerRequest.ping();
        if (result.isOk()) {
            if (status === 'disconnected') {
                pinger.emit('connect');
            }
            status = 'connected';
        } else {
            if (status === 'connected') {
                pinger.emit('disconnect');
            }
            status = 'disconnected';
        }

        pinger.emit('ping', result);
    }

    setTimeout(() => {
        ping();
        setInterval(ping, 1000 * 10);
    });

    return pinger;
}