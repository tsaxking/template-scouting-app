/* eslint-disable no-await-in-loop */
import { readdir } from 'fs/promises';
import { attemptAsync, Result } from '../../../shared/check';
import { Database } from './databases-2';
import path from 'path';
import { __root } from '../env';

export class Version {
    static readonly all: Version[] = [];

    constructor(
        public readonly description: string,
        public readonly major: number,
        public readonly minor: number,
        public readonly patch: number,
        public readonly update: (database: Database) => Promise<void>
    ) {}

    greaterThan(major: number, minor: number, patch: number, equalTo = false) {
        if (this.major > major) {
            return true;
        }

        if (this.major === major) {
            if (this.minor > minor) {
                return true;
            }

            if (this.minor === minor) {
                if (this.patch > patch) {
                    return true;
                } else if (this.patch === patch && equalTo) {
                    return true;
                }
            }
        }

        return false;
    }

    lessThan(major: number, minor: number, patch: number, equalTo = false) {
        return !this.greaterThan(major, minor, patch, equalTo);
    }

    is(major: number, minor: number, patch: number) {
        return (
            this.major === major && this.minor === minor && this.patch === patch
        );
    }
}

export const getVersions = (): Promise<Result<Version[]>> => {
    return attemptAsync(async () => {
        if (Version.all.length) {
            return Version.all;
        }

        const files = await readdir(
            path.resolve(__root, './storage/db/scripts/migrations')
        );

        const v = (
            await Promise.all(
                files.map(async file => {
                    const data = (await import(
                        path.resolve(
                            __root,
                            './storage/db/scripts/migrations',
                            file
                        )
                    )) as unknown;

                    const error = new Error(
                        'Invalid version file, must export default type of version'
                    );

                    if (
                        data &&
                        typeof data === 'object' &&
                        Object.keys(data).includes('default')
                    ) {
                        const d = (data as { default: Version }).default;
                        if (d instanceof Version) {
                            return d;
                        }

                        throw error;
                    }
                    throw error;
                })
            )
        ).sort((a, b) => {
            if (a.major !== b.major) {
                return a.major - b.major;
            }

            if (a.minor !== b.minor) {
                return a.minor - b.minor;
            }

            return a.patch - b.patch;
        });

        Version.all.push(...v);
        return Version.all;
    });
};
