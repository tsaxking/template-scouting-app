import { attemptAsync } from '../../shared/check';
import { spawn } from 'child_process';
import path from 'path';
import * as tsNode from 'ts-node';
import { __root } from './env';

/**
 * Runs a task in the terminal and returns the output
 * This task will die after 5 seconds
 * @date 3/8/2024 - 5:57:30 AM
 *
 * @async
 * @param {string} command
 * @param {string[]} args
 * @returns {unknown}
 */
export const runTask = async (command: string, args: string[]) => {
    return attemptAsync(() => {
        return new Promise<void>((res, rej) => {
            const task = spawn(command, args, {
                cwd: __root,
                stdio: 'pipe'
            });
            const end = (num: number) => {
                clearTimeout(timeout);
                if (!task.killed) task.kill();
                if (num === 0) res();
                else rej(new Error(`child process exited with code ${num}`));
            };
            const timeout = setTimeout(() => end(1), 1000 * 5);
            task.stdout.on('data', data => {
                console.log(data.toString());
            });
            task.stderr.on('data', data => {
                console.error(data.toString());
            });
            task.on('close', code => {
                end(code || 0);
            });
        });
    });
};

/**
 * Runs a function from a file and returns the output
 * @date 3/8/2024 - 5:57:30 AM
 *
 * @async
 * @template T
 * @param {string} file
 * @param {string} fn
 * @param {...string[]} params
 * @returns {unknown}
 */
export const runFile = async <T>(
    file: string,
    fn: string,
    ...params: string[]
) => {
    return attemptAsync(async () => {
        tsNode.register({ transpileOnly: true });
        const mod = await import(path.resolve(__root, file));
        const func = mod[fn];
        if (typeof func !== 'function') throw new Error('Function not found');
        return (await func(...params)) as T;
    });
};
