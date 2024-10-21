/* eslint-disable no-await-in-loop */
import { readdir } from "fs/promises";
import { attemptAsync, Result } from "../../../shared/check";
import { Database } from "./databases-2";
import path from "path";
import { __root } from "../env";
import { Backup } from './backups';
import { error } from "../terminal-logging";

export class Version {
    constructor(
        public description: string,
        public major: number,
        public minor: number,
        public patch: number,
        public update: (database: Database) => Promise<void>,
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
}



export const getVersions = (): Promise<Result<Version[]>> => {
    return attemptAsync(async () => {
        const files = await readdir(
            path.resolve(
                __root,
                './storage/db/scripts/migrations',
            )
        );

        return (await Promise.all(
            files.map(async file => {
                const data = await import(
                    path.resolve(
                        __root,
                        './storage/db/scripts/migrations',
                        file,
                    )
                ) as unknown;

                const error = new Error('Invalid version file, must export default type of version');

                if (data && typeof data === 'object' && Object.keys(data).includes('default')) {
                    const d = (data as { default: Version }).default;
                    if (d instanceof Version) {
                        return d;
                    }

                    throw error;
                }
                throw error;
            })
        )).sort((a, b) => {
            if (a.major !== b.major) {
                return a.major - b.major;
            }

            if (a.minor !== b.minor) {
                return a.minor - b.minor;
            }

            return a.patch - b.patch;
        });
    });
};

export const runUpdates = async (db: Database) => {
    return attemptAsync(async () => {
        const versions = (await getVersions()).unwrap();

        const current = (await db.getVersion()).unwrap();
    
        for (const v of versions) {
            if (v.greaterThan(current.major, current.minor, current.patch, false)) {
                const backup = (await Backup.makeBackup(db)).unwrap();
                try {
                    await v.update(db);
                } catch (e) {
                    error('Error updating database, restoring backup');
                    error('Version:', v);
                    error('Error:', e);
                    (await backup.restore(db)).unwrap();
                    throw e;
                }
            }
        }
    });
};