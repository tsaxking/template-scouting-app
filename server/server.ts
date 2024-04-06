import env, { __root } from './utilities/env';
import { error, log } from './utilities/terminal-logging';
import { App, ResponseStatus } from './structure/app/app';
import { getJSON, getJSONSync, log as serverLog } from './utilities/files';
import { homeBuilder } from './utilities/page-builder';
import Account from './structure/accounts';
import { router as admin } from './routes/admin';
import { router as account } from './routes/account';
import { router as api } from './routes/api';
import { router as role } from './routes/roles';
import { FileUpload } from './middleware/stream';
import { ReqBody } from './structure/app/req';
import { parseCookie } from '../shared/cookie';
import { stdin } from './utilities/stdin';
import path from 'path';
import { DB } from './utilities/databases';
import { Session } from './structure/sessions';
import { startPinger } from './utilities/ping';
import {
    Match,
    validateObj
} from '../shared/submodules/tatorscout-calculations/trace';
import { validate } from './middleware/data-type';
import { ServerRequest } from './utilities/requests';
import { TBA } from './utilities/tba/tba';
import { TBAEvent } from '../shared/tba';

if (process.argv.includes('--stats')) {
    const measure = () => {
        console.clear();
        const { rss, heapUsed, heapTotal } = process.memoryUsage();
        console.log('rss:', rss / 1024 / 1024, 'MB');
        console.log('heap:', heapUsed / 1024 / 1024, 'MB');
        console.log('total:', heapTotal / 1024 / 1024, 'MB');
    };
    setInterval(measure, 1000);
}

const port = +(env.PORT || 3000);

export const app = new App<{
    isTrusted: boolean;
}>(port, env.DOMAIN || `http://localhost:${port}`);

if (process.argv.includes('--ping')) {
    const pinger = startPinger();
    pinger.on('disconnect', () => {
        console.log('Servers are disconnected!');
    });
    pinger.on('connect', () => {
        console.log('Servers are connected!');
    });
    pinger.on('ping', () => {
        console.log('Pinged!');
    });
}

app.post('/env', (req, res) => {
    res.json({
        ENVIRONMENT: env.ENVIRONMENT,
        ALLOW_INTERNET: env.ALLOW_INTERNET,
        ALLOW_PRESCOUTING: env.ALLOW_PRESCOUTING
    });
});

app.post('/socket-init', (req, res) => {
    const cookie = req.headers.get('cookie');
    res.json(parseCookie(cookie || ''));
});

app.use('/*', (req, res, next) => {
    log(`[${req.method}] ${req.pathname}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // res.setHeader('Access-Control-Allow-Credentials', 'true');
    // res.setHeader('Access-Control-Allow-Headers', '*');
    // res.setHeader('Access-Control-Allow-Methods', '*');
    // res.setHeader('Access-Control-Expose-Headers', '*');
    next();
});

app.static('/client', path.resolve(__root, './client'));
app.static('/public', path.resolve(__root, './public'));
app.static('/dist', path.resolve(__root, './dist'));
app.static('/uploads', path.resolve(__root, './storage/uploads'));

app.post('/socket-url', (req, res) => {
    res.json({
        url: env.SOCKET_DOMAIN
    });
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.resolve(__root, './public/pictures/logo-square.png'));
});

app.get('/robots.txt', (req, res) => {
    res.sendFile(path.resolve(__root, './public/pictures/robots.jpg'));
});

function stripHtml(body: ReqBody) {
    if (!body) return body;
    let files: unknown;

    if (body.$$files) {
        files = JSON.parse(JSON.stringify(body.$$files));
        delete body.files;
    }

    let obj: ReqBody = {};

    const remove = (str: string) => str.replace(/(<([^>]+)>)/gi, '');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strip = (obj: any): unknown => {
        switch (typeof obj) {
            case 'string':
                return remove(obj);
            case 'object':
                if (Array.isArray(obj)) {
                    return obj.map(strip);
                }
                for (const key in obj) {
                    obj[key] = strip(obj[key]);
                }
                return obj;
            default:
                return obj;
        }
    };

    obj = strip(body) as ReqBody;

    if (files) {
        obj.$$files = files;
    }

    return obj;
}

app.post('/*', (req, res, next) => {
    req.body = stripHtml(req.body as ReqBody);

    try {
        const b = JSON.parse(JSON.stringify(req.body)) as {
            $$files?: FileUpload[];
            password?: string;
            confirmPassword?: string;
        }; // remove deep references
        delete b?.password;
        delete b?.confirmPassword;
        delete b?.$$files;
        console.log(b);
    } catch {
        console.log(req.body);
    }

    next();
});

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/*', async (req, res, next) => {
    const homePages = await getJSON<string[]>('pages/home');
    if (homePages.isOk()) {
        if (homePages.value.includes(req.url.slice(1))) {
            const r = await homeBuilder(req.url);
            if (r.isOk()) res.send(r.value);
        }
    }
    next();
});

app.get('/test/:page', (req, res, next) => {
    if (env.ENVIRONMENT !== 'dev') return next();
    const s = res.sendTemplate('entries/test/' + req.params.page);
    if (s.isErr()) {
        res.sendStatus('page:not-found', { page: req.params.page });
    }
});

app.route('/api', api);
app.route('/account', account);

app.get('/sign-in', (req, res) => {
    if (env.SECURITY_PIN && !req.session.customData.isTrusted) {
        res.sendTemplate('entries/sign-in');
    } else {
        res.redirect('/app');
    }
});

app.post<{
    pin: string;
}>(
    '/sign-in',
    validate({
        pin: 'string'
    }),
    (req, res) => {
        console.log('pin:', req.body.pin, env.SECURITY_PIN);
        if (req.body.pin === env.SECURITY_PIN) {
            req.session.customData.isTrusted = true;
            req.session.save();
            res.redirect('/app');
        } else {
            res.sendStatus('pin:incorrect');
        }
    }
);

app.use('/*', (req, res, next) => {
    console.log('isTrusted:', req.session.customData);
    if (env.SECURITY_PIN && !req.session.customData.isTrusted) {
        console.log('redirecting to sign-in');
        res.redirect('/sign-in');
    } else {
        next();
    }
});

app.get('/dashboard/admin', Account.allowPermissions('admin'), (_req, res) => {
    res.sendTemplate('entries/dashboard/admin');
});

app.route('/admin', admin);

app.get('/app', (req, res) => {
    res.sendTemplate('entries/app');
});

app.get('/*', (req, res) => {
    res.redirect('/app');
});

app.post<Match>(
    '/submit',
    validate(
        validateObj as {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key in keyof Match]: any; // TODO: export IsValid type
        }
    ),
    async (req, res) => {
        const {
            eventKey,
            checks,
            comments,
            matchNumber,
            teamNumber,
            compLevel,
            scout,
            date,
            group,
            trace,
            preScouting
        } = req.body;

        if (preScouting && !env.ALLOW_PRESCOUTING) {
            return res.sendStatus('pre-scouting:not-allowed');
        }

        // I don't want to pass in req.body because it can have extra unneeded properties
        const result = await ServerRequest.submitMatch({
            checks,
            comments,
            matchNumber,
            teamNumber,
            compLevel,
            eventKey,
            scout,
            date,
            group,
            trace,
            preScouting
        });

        if (result.isOk()) {
            res.sendStatus('server-request:match-submitted', {
                matchNumber,
                teamNumber,
                compLevel,
                data: result.value
            });
        } else {
            res.sendStatus('server-request:match-error', {
                matchNumber,
                teamNumber,
                compLevel,
                eventKey,
                scout,
                date,
                group,
                trace
            });

            if (result.isOk()) {
                res.sendStatus('server-request:match-submitted', {
                    matchNumber,
                    teamNumber,
                    compLevel,
                    data: result.value
                });
            } else {
                error('Match submission error:', result.error);
                res.sendStatus('server-request:match-error', {
                    matchNumber,
                    teamNumber,
                    compLevel,
                    error: result.error
                });
            }
        }
    }
);

app.post<{
    key: string;
}>('/event-data', async (req, res) => {
    const { key } = req.body;

    let name = 'dummy-event-data.json';
    if (env.ENVIRONMENT === 'prod') name = 'event-data.json';

    if (env.ALLOW_PRESCOUTING && req.body.key) {
        console.log('Requesting event data for', key);
        const data = await ServerRequest.getEventData(key);
        // console.log(data);
        if (data.isOk()) return res.json(data.value);
        else return res.status(500).json(data.error);
    }

    const data = getJSONSync(name);
    if (data.isOk()) {
        res.json(data.value);
    } else {
        res.status(500).json(data.error);
    }
});

app.post<{ year: number }>(
    '/get-events',
    validate({
        year: 'number'
    }),
    async (req, res) => {
        if (!env.ALLOW_PRESCOUTING) return res.json([]); // if prescouting is not allowed, return an empty array
        const events = await TBA.get<TBAEvent[]>('/events/' + req.body.year);
        // console.log({ events });
        if (events.isOk()) {
            // console.log('num events:', events.value?.length);
            res.json(events.value);
        } else {
            res.status(500).json(events.error);
        }
    }
);

app.get('/*', (req, res) => {
    if (!res.fulfilled) {
        res.sendStatus('page:not-found', { page: req.pathname });
    }
});

app.final<{
    $$files?: FileUpload;
    password?: string;
    confirmPassword?: string;
}>((req, res) => {
    // req.session.save();

    if (res.fulfilled) {
        serverLog('request', {
            date: Date.now(),
            duration: Date.now() - req.start,
            ip: req.session?.ip,
            method: req.method,
            url: req.pathname,
            status: res._status,
            userAgent: req.headers.get('user-agent') || '',
            // body: '',
            body:
                req.method == 'post' && req.body
                    ? JSON.stringify(
                          (() => {
                              let { body } = req;
                              body = JSON.parse(JSON.stringify(body)) as {
                                  $$files?: FileUpload;
                                  password?: string;
                                  confirmPassword?: string;
                              };
                              delete body?.password;
                              delete body?.confirmPassword;
                              delete body?.$$files;
                              return body;
                          })()
                      )
                    : '',
            params: JSON.stringify(req.params),
            query: JSON.stringify(req.query)
        });
    }
});

DB.em.on('connect', () => app.start());
