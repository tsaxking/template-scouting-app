import { Color } from '../client/submodules/colors/color';
import { fromSnakeCase, toCamelCase } from '../shared/text';
import fs from 'fs';

(async () => {
    const file = './client/styles/temp.css';
    const css = await fs.promises.readFile(file, 'utf8');

    const regex = /--([a-zA-Z-:\s#0-9,().])+/g;

    let colorStr = '';

    const matches = css.match(regex);
    if (!matches) throw new Error('No matches found');
    for (const match of matches) {
        const [key, value] = match.split(':');
        if (!value.trim().startsWith('#')) continue;
        const c = Color.fromHex(value.trim());
        colorStr += `'${toCamelCase(
            fromSnakeCase(key.replace('--', ''), '-')
        )}': [${[c.r, c.g, c.b]}],\n`;
    }

    console.log(colorStr);
})();
