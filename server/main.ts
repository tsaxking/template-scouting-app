import { stdin } from './utilities/stdin.ts';
import { Builder } from './bundler.ts';
import { Colors } from './utilities/colors.ts';
import { ServerRequest } from './utilities/requests.ts';
import { attempt } from '../shared/check.ts';
import { runTask } from './utilities/run-task.ts';

const log = (...args: any[]) =>
    console.log(Colors.FgBlue, '[MAIN]', Colors.Reset, ...args, Colors.Reset);

const main = () => {
    const { args } = Deno;
    const builder = new Builder();

    const start = (): Deno.ChildProcess => {
        log('Starting server...');
        const child = new Deno.Command(Deno.execPath(), {
            args: ['run', '--allow-all', './server/server.ts'],
            stdout: 'inherit',
            stderr: 'inherit',
            stdin: 'inherit',
        }).spawn();

        // child.stderr.pipeTo(Deno.stderr.writable);
        // child.stdout.pipeTo(Deno.stdout.writable);
        return child;
    };

    const restart = (child: Deno.ChildProcess): Deno.ChildProcess => {
        try {
            child.kill();
            log('Terminated server');
        } catch (error) {
            log('Failed to kill server', error);
        }
        return start();
    };

    const build = () => {
        builder.build();
        if (child) child = restart(child);
    };

    let child: Deno.ChildProcess;
    build();
    child = start();

    if (args.includes('--stdin')) {
        log('Listening for rs and rb');
        stdin.on('rs', () => {
            log('Restarting...');
            child = restart(child);
        });

        stdin.on('rb', () => {
            build();
        });

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
    }

    const watchers: Deno.FsWatcher[] = [];

    if (args.includes('--watch')) {
        builder.watch('./client');
        builder.watch('./shared');

        const watch = async (path: string) => {
            log('Watching', path);
            const watcher = Deno.watchFs(path);
            watchers.push(watcher);
            for await (const event of watcher) {
                log('file change detected.. Restarting server');
                switch (event.kind) {
                    case 'create':
                    case 'modify':
                    case 'remove':
                        child = restart(child);
                        break;
                }
            }
        };

        watch('./server');
        watch('./shared');
    }

    Deno.addSignalListener('SIGINT', () => {
        child.kill();
        builder.close();
        for (const watcher of watchers) watcher.close();
        Deno.exit();
    });
};

if (import.meta.main) main();
