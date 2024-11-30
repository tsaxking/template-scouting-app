import { Colors } from '../server/utilities/colors';
import env from '../server/utilities/env';
import { sleep } from '../shared/sleep';
import { DB } from '../server/utilities/database';

const main = async () => {
    if (env.ENVIRONMENT !== 'test')
        throw new Error('This script can only be run in test environment');
    for (let count = 5; count > 0; count--) {
        console.warn(
            Colors.FgYellow,
            `This script will reset the database, You have ${count} second${count > 0 ? 's' : ''} to cancel...`,
            Colors.Reset
        );
        console.clear();
        await sleep(1000);
    }

    (await DB.reset(process.argv.includes('--hard'))).unwrap();
    process.exit(0);
};

if (require.main === module) main();
