import env from './env';
import { attemptAsync, Result } from '../../shared/check';
import { Match } from '../../shared/submodules/tatorscout-calculations/trace';
import { DB } from './databases';
import { uuid } from './uuid';
import { Assignment } from '../../shared/submodules/tatorscout-calculations/scout-groups';
import {
    TBAMatch,
    TBATeam
} from '../../shared/submodules/tatorscout-calculations/tba';
import { request } from './request';
import { getJSONSync, saveJSON, saveJSONSync } from './files';

const { SERVER_DOMAIN, SERVER_KEY } = env;
if (!SERVER_DOMAIN) console.warn('SERVER_DOMAIN not properly set in .env file');

export class ServerRequest {
    private static post<T>(url: string, body?: unknown): Promise<Result<T>> {
        return attemptAsync(async () => {
            const str = body ? JSON.stringify(body) : '';
            const id = uuid();

            if (url !== '/ping') {
                DB.run('server-requests/new', {
                    id,
                    url,
                    body: str,
                    date: Date.now()
                });
            }

            const data = await request<{
                status?: number;
            }>(SERVER_DOMAIN + '/api/event-server' + url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-key': SERVER_KEY as string
                },
                data: str
            });

            if (data.isErr()) throw data.error;

            if (data.isOk()) {
                if (data.value.status?.toString().startsWith('4')) {
                    throw new Error('Invalid request');
                }

                if (data.value.status?.toString().startsWith('5')) {
                    throw new Error('Server error');
                }

                if (url !== '/ping') {
                    DB.run('server-requests/update', {
                        id,
                        response: JSON.stringify(data.value)
                    });
                }

                return data.value as T;
            }
            throw new Error('No data');
        });
    }
    
    public static get<T>(url: string): Promise<Result<T>> {
        return attemptAsync(async () => {
            const id = uuid();

            const data = await request<{
                status?: number;
            }>(SERVER_DOMAIN + url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-key': SERVER_KEY as string
                },
            });

            if (data.isErr()) throw data.error;

            if (data.isOk()) {
                if (data.value.status?.toString().startsWith('4')) {
                    throw new Error('Invalid request');
                }

                if (data.value.status?.toString().startsWith('5')) {
                    throw new Error('Server error');
                }

                if (url !== '/ping') {
                    DB.run('server-requests/update', {
                        id,
                        response: JSON.stringify(data.value)
                    });
                }

                return data.value as T;
            }
            throw new Error('No data');
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
                }
                throw new Error(result.value.error);
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
            eventKey
        });
    }

    public static async getAccounts() {
        return attemptAsync(async () => {
            const exists = getJSONSync('accounts.json');
            if (exists.isOk()) return exists.value;

            // retrieves all usernames from the server, good for autocomplete on sign in
            const a = await ServerRequest.post<string[]>('/get-accounts');
            if (a.isOk()) {
                saveJSONSync('accounts.json', a.value);
                return a.value;
            }
            throw a.error;
        });
    }

    public static async signIn(username: string, password: string) {
        return ServerRequest.post<boolean>('/sign-in', {
            username,
            password
        });
    }

    public static async ping() {
        return attemptAsync(() => {
            return new Promise<void>((res, rej) => {
                setTimeout(() => {
                    rej(new Error('Request timed out'));
                }, 1000 * 10);

                ServerRequest.post('/ping').then(r => {
                    if (r.isOk()) res();
                    else rej(r.error);
                });
            });
        });
    }
}
