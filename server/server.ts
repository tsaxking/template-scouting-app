import env, { __root, resolve } from './utilities/env.ts';
import { error, log } from './utilities/terminal-logging.ts';
import { App, ResponseStatus } from './structure/app/app.ts';
import { Session } from './structure/sessions.ts';
import Account from './structure/accounts.ts';
import { log as serverLog } from './utilities/files.ts';
import { runBuild } from './bundler.ts';
import { router as api } from './routes/api.ts';
import { FileUpload } from './middleware/stream.ts';
import { stdin } from './utilities/utilties.ts';
import { ReqBody } from './structure/app/req.ts';
import { validate } from './middleware/data-type.ts';
import {
    Match,
    validateObj,
} from '../shared/submodules/tatorscout-calculations/trace.ts';
import Role from './structure/roles.ts';
import { ServerRequest } from './utilities/requests.ts';
import { getJSONSync } from './utilities/files.ts';
import { runTask } from './utilities/run-task.ts';
import { attempt } from '../shared/attempt.ts';
import { startPinger } from './utilities/ping.ts';
import { router as account } from './routes/account.ts';
import { router as admin } from './routes/admin.ts';

const port = +(env.PORT || 3000);
const domain = env.DOMAIN || `http://localhost:${port}`;

export const app = new App(port, domain, {
    // onListen: () => {
    // log(`Listening on ${domain}`);
    // },
    // onConnection: (socket) => {
    // log('New connection:', socket.id);
    // },
    ioPort: +(env.SOCKET_PORT || port + 1),
});

const builder = await runBuild();

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

// building client listeners
builder.on('build', () => {
    if (env.ENVIRONMENT === 'dev') app.io.emit('reload');
    log('Build complete');
});

stdin.on('rb', () => builder.emit('build'));
stdin.on('ping', async () => {
    const result = await ServerRequest.ping();
    if (result.isOk()) console.log('Servers are connected!');
    else console.log('Servers are disconnected!');
});

stdin.on('data', (data) => {
    const [command, ...args] = data.split(' ');
    switch (command) {
        case 'event':
            attempt(() =>
                runTask('./scripts/event-data.ts', 'getEvent', ...args)
            );
            break;
    }
});

builder.on('error', (e) => log('Build error:', e));

app.use('/*', (req, res, next) => {
    log(`[${req.method}] ${req.url}`);
    next();
});

app.static('/client', resolve(__root, './client'));
app.static('/public', resolve(__root, './public'));
app.static('/dist', resolve(__root, './dist'));
app.static('/uploads', resolve(__root, './uploads'));

app.use('/*', Session.middleware());

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
//     if (!req.session?.accountId) {
//         req.session!.prevUrl = req.url;
//         return res.redirect('/account/sign-in');
//     }

//     next();
// });

app.get('/dashboard/admin', Role.allowRoles('admin'), (_req, res) => {
    res.sendTemplate('entries/admin');
});

app.route('/admin', admin);

app.get('/app', (req, res) => {
    res.sendTemplate('entries/app');
});

app.get('/*', (req, res) => {
    res.redirect('/app');
});

app.post<Match>('/submit', validate(validateObj as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key in keyof Match]: any; // TODO: export IsValid type
}), async (req, res) => {
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
        trace
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
        error
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
});

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
    req.session.save();

    serverLog('request', {
        date: Date.now(),
        duration: Date.now() - req.start,
        ip: req.session?.ip,
        method: req.method,
        url: req.url,
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
