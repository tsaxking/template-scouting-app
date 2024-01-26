import env from './env.ts'
import { attemptAsync, Result } from '../../shared/attempt.ts';
import { Match } from '../../shared/submodules/tatorscout-calculations/match-submission.ts';
import { DB } from './databases.ts';
import { uuid } from './uuid.ts';
import { Assignment } from '../../shared/submodules/tatorscout-calculations/scout-groups.ts';
import { TBAMatch, TBATeam } from '../../shared/submodules/tatorscout-calculations/tba.ts';

const { SERVER_DOMAIN, SERVER_KEY } = env;
if (!SERVER_DOMAIN) console.warn('SERVER_DOMAIN not properly set in .env file');



export class ServerRequest {
    public static post<T>(url: string, body?: unknown): Promise<Result<T>> {
        return attemptAsync(async () => {
            const str = JSON.stringify(body) || '';
            const id = uuid();

            DB.run('server-requests/new', {
                id,
                url,
                body: str,
                date: Date.now().toString()
            });

            const data = await fetch(
                SERVER_DOMAIN + url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-key': SERVER_KEY as string
                    },
                    body: str,
                }
            );

            if (data.status.toString().startsWith('4')) {
                throw new Error('Invalid request');
            }

            if (data.status.toString().startsWith('5')) {
                throw new Error('Server error');
            }

            const json = data.json();

            DB.run('server-requests/update', {
                id,
                response: JSON.stringify(json)
            });

            return json as T;
        });
    }

    public static async submitMatch(match: Match) {
        return ServerRequest.post('/api/event-server/match', match);
    }

    public static async getScoutGroups(eventKey: string) {
        return ServerRequest.post<{
            assignments: Assignment,
            matches: TBAMatch[],
            teams: TBATeam[],
            eventKey
        }>('/api/event-server/scout-groups', { 
            eventKey
        });
    }
}