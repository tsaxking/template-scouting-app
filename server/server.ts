import env, { __root, resolve } from './utilities/env.ts';
import { error, log } from './utilities/terminal-logging.ts';
import { App, ResponseStatus } from './structure/app/app.ts';
import { log as serverLog } from './utilities/files.ts';
import { router as admin } from './routes/admin.ts';
import { router as account } from './routes/account.ts';
import { router as api } from './routes/api.ts';
import { FileUpload } from './middleware/stream.ts';
import { ReqBody } from './structure/app/req.ts';
import { validate } from './middleware/data-type.ts';
import { parseCookie } from '../shared/cookie.ts';
import { io, Socket } from './structure/socket.ts';
import {
    Match,
    validateObj,
} from '../shared/submodules/tatorscout-calculations/trace.ts';
import { ServerRequest } from './utilities/requests.ts';
import { getJSONSync } from './utilities/files.ts';
import { startPinger } from './utilities/ping.ts';
import Account from './structure/accounts.ts';

if (Deno.args.includes('--stats')) {
    const measure = () => {
        console.clear();
        const { rss, heapUsed, heapTotal } = Deno.memoryUsage();
        console.log('rss:', rss / 1024 / 1024, 'MB');
        console.log('heap:', heapUsed / 1024 / 1024, 'MB');
        console.log('total:', heapTotal / 1024 / 1024, 'MB');
    };

    setInterval(measure, 1000);
}

const port = +(env.PORT || 3000);

export const app = new App(port, env.DOMAIN || `http://localhost:${port}`, {
    // onListen: () => {
    // log(`Listening on ${domain}`);
    // },
    // onConnection: (socket) => {
    // log('New connection:', socket.id);
    // },
    blockedIps: (() => {
        const blocked = getJSONSync<string[]>('blocked-ips');
        if (blocked.isOk()) return blocked.value;
        return [];
    })(),
    ioPort: +(env.SOCKET_PORT || port + 1),
});

if (Deno.args.includes('--ping')) {
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

io.on('connection', (s: Socket) => {
    log('New connection:', s.id);
    s.on('disconnect', () => {
        log('Disconnected:', s.id);
    });
});
app.use('/*', (req, res, next) => {
    log(`[${req.method}] ${req.url}`);
    next();
});

app.post('/env', (req, res) => {
    res.json({
        ENVIRONMENT: env.ENVIRONMENT,
    });
});

app.post('/socket-init', (req, res) => {
    const cookie = req.headers.get('cookie');
    res.json(parseCookie(cookie));
});

app.get('/*', (req, res, next) => {
    log(`[${req.method}] ${req.pathname}`);
    next();
});

app.static('/client', resolve(__root, './client'));
app.static('/public', resolve(__root, './public'));
app.static('/dist', resolve(__root, './dist'));
app.static('/uploads', resolve(__root, './uploads'));

app.post('/socket-url', (req, res) => {
    res.json({
        url: env.SOCKET_DOMAIN,
    });
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(resolve(__root, './public/pictures/logo-square.png'));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripHtml(body: any) {
    if (!body) return body;
    let files: unknown;

    if (body.$$files) {
        files = JSON.parse(JSON.stringify(body.$$files));
        delete body.files;
    }

    let obj: ReqBody = {};

    const remove = (str: string) => str.replace(/(<([^>]+)>)/gi, '');

    const strip = (obj: unknown): unknown => {
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

    log('[POST]', req.url.pathname);
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

// TODO: There is an error with the email validation middleware
// app.post('/*', emailValidation(['email', 'confirmEmail'], {
//     onspam: (req, res, next) => {
//         res.sendStatus('spam:detected');
//     },
//     // onerror: (req, res, next) => {
//     //     // res.sendStatus('unknown:error');
//     //     next();
//     // }
// }));

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/test/:page', (req, res, next) => {
    if (env.ENVIRONMENT !== 'dev') return next();
    const s = res.sendTemplate('entries/test/' + req.params.page);
    if (s === ResponseStatus.error || s === ResponseStatus.fileNotFound) {
        res.sendStatus('page:not-found', { page: req.params.page });
    }
});

app.route('/api', api);
app.route('/account', account);

// app.use('/*', Account.autoSignIn(env.AUTO_SIGN_IN));

// app.get('/*', (req, res, next) => {
//     if (!req.session.accountId) {
//         if (
//             ![
//                 '/account/sign-in',
//                 '/account/sign-up',
//                 '/account/forgot-password',
//             ].includes(req.url)
//         ) {
//             // only save the previous url if it's not a sign-in, sign-up, or forgot-password page
//             // this is so that the user can be redirected back to the page they initially were trying to access
//             req.session.prevUrl = req.url;
//         }
//         return res.redirect('/account/sign-in');
//     }

//     next();
// });

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
        },
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
        } = req.body;

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
        });

        if (result.isOk()) {
            res.sendStatus('server-request:match-submitted', {
                matchNumber,
                teamNumber,
                compLevel,
                data: result.value,
            });
        } else {
            error;
            res.sendStatus('server-request:match-error', {
                matchNumber,
                teamNumber,
                compLevel,
                eventKey,
                scout,
                date,
                group,
                trace,
            });

            if (result.isOk()) {
                res.sendStatus('server-request:match-submitted', {
                    matchNumber,
                    teamNumber,
                    compLevel,
                    data: result.value,
                });
            } else {
                error('Match submission error:', result.error);
                res.sendStatus('server-request:match-error', {
                    matchNumber,
                    teamNumber,
                    compLevel,
                    error: result.error,
                });
            }
        }
    },
);

app.post('/event-data', async (_req, res) => {
    let name: string = 'dummy-event-data.json';
    if (env.ENVIRONMENT === 'prod') name = 'event-data.json';
    const data = getJSONSync(name);
    if (data.isOk()) {
        res.json(data.value);
    } else {
        res.status(500).json(data.error);
    }
});

app.final<{
    $$files?: FileUpload;
    password?: string;
    confirmPassword?: string;
}>((req, res) => {
    // req.session.save();

    serverLog('request', {
        date: Date.now(),
        duration: Date.now() - req.start,
        ip: req.session?.ip,
        method: req.method,
        url: req.url.pathname,
        status: res._status,
        userAgent: req.headers.get('user-agent') || '',
        body: req.method == 'post'
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
                })(),
            )
            : '',
        params: JSON.stringify(req.params),
        query: JSON.stringify(req.query),
    });

    if (!res.fulfilled) {
        res.sendStatus('page:not-found');
    }
});
