import { attemptAsync } from "../../../shared/check";
import { gitBranch, gitCommit } from "../git";
import { Database, Query, SimpleParameter } from "./databases-2";
import fs from 'fs';
import path from 'path';
import { __root } from "../env";
import ObjectsToCsv from 'objects-to-csv';
import zl from 'zip-lib';
import csv from 'csv-parser';

type Metadata = {
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    commit: string;
    branch: string;
    date: string;
}

export class Backup{
    public static makeBackup(database: Database) {
        return attemptAsync(async () => {
            // create a zip file of the database with csv files for each table and a json for metadata

            const [v, c, b] = await Promise.all([
                database.getVersion(),
                gitCommit(),
                gitBranch()
            ]);

            const metadata: Metadata = {
                version: v.unwrap(),
                commit: c.unwrap(),
                branch: b.unwrap(),
                date: new Date().toISOString(),
            };

            const tables = (await database.getTables()).unwrap();

            await fs.promises.mkdir(
                path.resolve(__root, `./storage/db/backups/${metadata.date}`),
                { recursive: true },
            );

            // build the csv files
            await Promise.all(
                tables.map(async table => {
                    const data = (await database.unsafe.all(
                        Query.build(`SELECT * FROM ${table};`)
                    )).unwrap();

                    if (!data.every(d => typeof d === 'object')) {
                        throw new Error('Invalid data');
                    }

                    const csv = new ObjectsToCsv(data as Record<string, unknown>[]);

                    await csv.toDisk(
                        path.resolve(__root, `./storage/db/backups/${metadata.date}/${table}.csv`),
                    );
                }),
            );

            const meta = JSON.stringify(metadata, null, 2);
            await fs.promises.writeFile(
                path.resolve(__root, `./storage/db/backups/${metadata.date}/metadata.json`),
                meta,
            );

            const zip = new zl.Zip();

            zip.addFolder(
                path.resolve(__root, `./storage/db/backups/${metadata.date}`),
            );

            zip.archive(
                path.resolve(__root, `./storage/db/backups/${metadata.date}.zip`),
            );

            fs.promises.rm(
                path.resolve(__root, `./storage/db/backups/${metadata.date}`),
                { recursive: true },
            );

            return new Backup(
                path.resolve(__root, `./storage/db/backups/${metadata.date}`),
            );
        });
    }

    public static getBackups() {
        return attemptAsync(() => {
            return fs.promises.readdir(
                path.resolve(__root, './storage/db/backups'),
            );
        });
    }

    constructor(
        public readonly path: string,
    ) {}

    restore(database: Database) {
        return attemptAsync(async () => {
            await zl.extract(
                `${this.path}.zip`,
                this.path,
            );

            const version = (await database.getVersion()).unwrap();

            const meta: Metadata = JSON.parse(
                await fs.promises.readFile(
                    path.resolve(this.path, 'metadata.json'),
                    'utf-8',
                ),
            );

            if (
                meta.version.major !== version.major ||
                meta.version.minor !== version.minor ||
                meta.version.patch !== version.patch
            ) {
                throw new Error('Version mismatch');
            }

            const tables = (await fs.promises.readdir(this.path)).filter(f => f.endsWith('.csv'));
            fs.promises.rm(this.path, { recursive: true });

            // TODO: use workers to parallelize this

            await Promise.all(
                tables.map(table => {
                    return new Promise((res, rej) => {
                        const stream = fs.createReadStream(path.resolve(this.path, table))
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .pipe(csv() as any)
                            .on('data', async (data: Record<string, SimpleParameter>) => {
                                const cols = Object.keys(data);
                                const colNames = cols.join(', ');
                                const colVals = cols.map(c => `:${c}`).join(', ');

                                const q = `INSERT INTO ${table} (${colNames}) VALUES (${colVals})`;
                                const r = await database.unsafe.run(
                                    Query.build(q, data),
                                );

                                if (r.isErr()) {
                                    rej(r.error);
                                }
                            })
                            .on('end', () => {
                                stream.end();
                            });
                    });
                }),
            );
        });
    }
}