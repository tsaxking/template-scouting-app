import env from './env.ts';
import { attemptAsync, Result } from '../../shared/attempt.ts';
import { Match } from '../../shared/submodules/tatorscout-calculations/trace.ts';
import { DB } from './databases.ts';
import { uuid } from './uuid.ts';
import { Assignment } from '../../shared/submodules/tatorscout-calculations/scout-groups.ts';
import {
    TBAMatch,
    TBATeam,
} from '../../shared/submodules/tatorscout-calculations/tba.ts';

const { SERVER_DOMAIN, SERVER_KEY } = env;
if (!SERVER_DOMAIN) console.warn('SERVER_DOMAIN not properly set in .env file');

export class ServerRequest {
    private static post<T>(url: string, body?: unknown): Promise<Result<T>> {
        return attemptAsync(async () => {
            const str = JSON.stringify(body) || '';
            const id = uuid();

            if (url !== '/ping') {
                DB.run('server-requests/new', {
                    id,
                    url,
                    body: str,
                    date: Date.now().toString(),
                });
            }

            const data = await fetch(
                SERVER_DOMAIN + '/api/event-server' + url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-key': SERVER_KEY as string,
                    },
                    body: str,
                },
            );

            if (data.status.toString().startsWith('4')) {
                throw new Error('Invalid request');
            }

            if (data.status.toString().startsWith('5')) {
                throw new Error('Server error');
            }

            const json = await data.json();

            if (url !== '/ping') {
                DB.run('server-requests/update', {
                    id,
                    response: JSON.stringify(json),
                });
            }

            return json as T;
        });
    }

    public static async submitMatch(match: Match) {
        return attemptAsync(async () => {
            const result = await ServerRequest.post<
                | {
                    success: false;
                    error: string;
                }
                | {
                    success: true;
                }
            >('/submit-match', match);

            if (result.isOk()) {
                if (result.value.success) {
                    return;
                } else {
                    throw new Error(result.value.error);
                }
            } else {
                throw result.error;
            }
        });
    }

    public static async getEventData(eventKey: string) {
        return ServerRequest.post<{
            assignments: Assignment;
            matches: TBAMatch[];
            teams: TBATeam[];
            eventKey: string;
        }>('/scout-groups', {
            eventKey,
        });
    }

    public static async getAccounts() {
        // retrieves all usernames from the server, good for autocomplete on sign in
        return ServerRequest.post<string[]>('/get-accounts');
    }

    public static async signIn(username: string, password: string) {
        return ServerRequest.post<boolean>('/sign-in', {
            username,
            password,
        });
    }

    public static async ping() {
        return attemptAsync(() => {
            return new Promise<void>((res, rej) => {
                setTimeout(() => {
                    rej(new Error('Request timed out'));
                }, 1000 * 10);

                ServerRequest.post('/ping').then((r) => {
                    if (r.isOk()) res();
                    else rej(r.error);
                });
            });
        });
    }
}
