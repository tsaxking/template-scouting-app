import { getJSON } from '../server/utilities/files.ts';
import { attemptAsync } from '../shared/check.ts';

export const pullDeps = async () => {
    return attemptAsync(async () => {
        // delete everything in the deps folder
        const res = await deleteDeps();

        if (res.isErr()) throw res.error;

        console.log('Getting dependencies');
        const data = await getJSON('dependencies');
        if (data.isErr()) throw new Error('Failed to get dependencies');

        const deps = data.value as string[];
        if (!Array.isArray(deps)) throw new Error('Invalid dependencies');
        if (!deps.every((d) => typeof d === 'string')) {
            throw new Error('Invalid dependencies');
        }

        console.log(`Pulling ${deps.length} dependencies`);

        const isUrl = (url: string) => {
            try {
                new URL(url);
                return true;
            } catch (error) {
                return false;
            }
        };

        for (const dep of deps) {
            if (!isUrl(dep)) {
                throw new Error(`Invalid URL: ${dep}`);
            }
        }

        const parse = (url: string) => url.replace(/([/\\.])/g, '_');

        const promises = deps.map(async (dep) =>
            fetch(dep)
                .then((data) => {
                    console.log('Successfully fetched', dep);
                    if (data.ok) {
                        return data.arrayBuffer();
                    } else {
                        return Promise.reject(`Failed to fetch ${dep}`);
                    }
                })
                .then(async (buffer) => {
                    const name = parse(dep);
                    const path = `client/deps/${name}`;

                    console.log('Saving', path);

                    await Deno.writeFile(path, new Uint8Array(buffer));

                    return path;
                })
                .catch(console.error)
        );

        let str =
            '// this file is auto-generated by the manager, please do not modify\n';
        str += deps.map((dep) => `import '../deps/${parse(dep)}';`).join('\n');

        console.log('Writing client/utilities/deps.ts');
        return Promise.all([
            Deno.writeTextFile('client/utilities/deps.ts', str),
            ...promises,
        ]);
    });
};

export const deleteDeps = async () => {
    return attemptAsync(async () => {
        console.log('Deleting dependencies');
        try {
            console.log('Deleting client/deps');
            await Deno.remove('client/deps', { recursive: true });
        } catch (error) {
            console.error(error);
        }

        try {
            console.log('Recreating client/deps');
            await Deno.mkdir('client/deps');
        } catch {
            // do nothing
        }

        console.log('Resetting client/utilities/deps.ts');
        await Deno.writeTextFile(
            'client/utilities/deps.ts',
            '// this file is auto-generated by the manager, please do not modify\n',
        );
    });
};
