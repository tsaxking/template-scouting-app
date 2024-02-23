import { Color } from '../client/submodules/colors/color.ts';
import { fromSnakeCase, toCamelCase } from '../shared/text.ts';

const file = './client/styles/temp.css';
const css = await Deno.readTextFile(file);

const regex = /--([a-zA-Z-:\s#0-9,().])+/g;

let colorStr = '';

const matches = css.match(regex);
if (!matches) throw new Error('No matches found');
for (const match of matches) {
    const [key, value] = match.split(':');
    if (!value.trim().startsWith('#')) continue;
    const c = Color.fromHex(value.trim());
    colorStr += `'${
        toCamelCase(
            fromSnakeCase(key.replace('--', ''), '-'),
        )
    }': [${[c.r, c.g, c.b]}],\n`;
}

console.log(colorStr);
