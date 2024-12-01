import { Struct } from '../../models/struct';
import { socket } from '../../utilities/socket';

const s = new Struct({
    socket,
    name: 'TestStruct',
    structure: {
        name: 'text',
        age: 'integer'
    }
});

console.log(s);

(async () => {
    const all = s.all(true);
    const u = all.subscribe(console.log);

    // console.log((await all.await()).unwrap());

    // (await s.new({
    //     name: 'John',
    //     age: 25,
    // })).unwrap();
})();
