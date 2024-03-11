// Purpose: Main entry point for the server.
// This file is responsible for starting the server, watching, handling the build process, and handling the process lifecycle.
// Eventually, this file will be responsible for starting multiple servers and managing them, cycling through them for load balancing.

import { Builder } from './bundler';
import { Colors } from './utilities/colors';
import { deleteDeps, pullDeps } from '../scripts/pull-deps';
// import { Worker } from "worker_threads";
// import env from "./utilities/env";
import { ChildProcess, spawn } from 'child_process';
import { stdin } from './utilities/stdin';
import path from 'path';
import { attempt } from '../shared/check';
import { runFile } from './utilities/run-task';
import { ServerRequest } from './utilities/requests';

// TODO: Multithreading
// class Server {
//     static readonly workers = new Map<number, Server>();

//     static start() {
//         const workers = Server.workers.values();
//         for (const worker of workers) {
//             worker.start();
//         }
//     }
//     static kill() {
//         const workers = Server.workers.values();
//         for (const worker of workers) {
//             worker.kill();
//         }
//     }
//     static restart() {
//         Server.kill();
//         Server.start();
//     }

//     private worker: Worker;

//     constructor(public readonly id: number) {
//         Server.workers.set(id, this);
//     }

//     start() {
//         this.worker = new Worker('./server.ts', {
//             workerData: {
//                 port: this.id
//             }
//         });
//     }
//     kill() {
//         this.worker.terminate();
//     }
// }

/**
 * Logs a message to the console
 * @date 3/8/2024 - 6:03:56 AM
 *
 * @param {...unknown[]} args
 * @returns {*}
 */
const log = (...args: unknown[]) =>
    console.log(
        Colors.FgBlue,
        '[Main]',
        Colors.FgMagenta,
        new Date().toISOString(),
        Colors.Reset,
        ...args
    );

/**
 * Main function
 * @date 3/8/2024 - 6:03:56 AM
 *
 * @async
 * @returns {*}
 */
const main = async () => {
    const res = await pullDeps();
    if (res.isErr()) throw res.error;

    // const servers = Number(env.NUM_SERVERS) || 1;

    // for (let i = 0; i < servers; i++) new Server(i);

    const args = process.argv.slice(2);
    log('Args:', args);

    // temporary
    const start = (): ChildProcess => {
        log('Starting server...');
        const child = spawn('ts-node', [
            path.resolve(__dirname, './server.ts')
        ]);

        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        child.stdin.pipe(process.stdin);

        return child;
    };
    const kill = (child: ChildProcess | undefined) => {
        if (!child) return;
        child.kill();
    };
    const restart = (child: ChildProcess | undefined): ChildProcess => {
        if (!child) return start();
        kill(child);
        return start();
    };

    const builder = new Builder();
    let child: ChildProcess | undefined = undefined;

    if (args.includes('stdin')) {
        stdin.on('rs', () => {
            child = restart(child);
        });
        stdin.on('rb', async () => {
            await builder.build();
        });

        stdin.on('ping', async () => {
            const result = await ServerRequest.ping();
            if (result.isOk()) console.log('Servers are connected!');
            else console.log('Servers are disconnected!');
        });

        stdin.on('data', data => {
            const [command, ...args] = data.split(' ');
            switch (command) {
                case 'event':
                    attempt(() =>
                        runFile('./scripts/event-data.ts', 'getEvent', ...args)
                    );
                    break;
            }
        });

        stdin.on('ping', async () => {
            const result = await ServerRequest.ping();
            if (result.isOk()) console.log('Servers are connected!');
            else console.log('Servers are disconnected!');
        });

        stdin.on('data', data => {
            const [command, ...args] = data.split(' ');
            switch (command) {
                case 'event':
                    attempt(() =>
                        runFile('./scripts/event-data.ts', 'getEvent', ...args)
                    );
                    break;
            }
        });
    }

    builder.em.on('build', () => {
        log('Rebuilding...');
        child = restart(child);
    });

    builder.build();

    // child = start();

    if (args.includes('watch')) {
        builder.watch('./client');
        builder.watch('./shared');
        builder.watch('./server');
    }

    const close = () => {
        builder.close();
        kill(child);
        // Server.kill();
        deleteDeps()
            .then(() => {
                log('Goodbye! 👋');
                process.exit(0);
            })
            .catch(e => {
                log('Failed to delete deps', e);
                process.exit(1);
            });
        // process.exit(0);
    };

    process.on('SIGINT', close);
    process.on('SIGTERM', close);
    process.on('exit', close);
    process.on('uncaughtException', e => {
        log('Uncaught exception:', e);
        close();
    });
    process.on('unhandledRejection', e => {
        log('Unhandled rejection:', e);
        close();
    });
};

if (require.main === module) {
    main().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
