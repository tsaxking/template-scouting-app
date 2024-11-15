# Structs

Structs are a way to create custom data types in this project. Once initialized, they create a table in the connected database, have their own versioning and backup systems, and communicate with the front end through its API.

Structs create default properties for all the data they store. They are as follows:

-   id: string
-   created: string
-   updated: string
-   archived: boolean

Samples can be found in /server/structure/structs/samples.

## Initialization

```typescript
import { Struct } from '/server/structure/structs/struct.ts';

export namespace MyNamespace {
    export const MyStruct = new Struct({
        name: 'MyStruct',
        database: DATABASE, // Database connection
        structure: {
            // desired structure using database types
            name: 'text',
            age: 'integer'
            // etc.
        },

        // optional parameters:
        versionHistory: {
            amount: 10, // amount of versions to keep or days to keep
            type: 'versions' // 'versions' or 'days'
        },

        generators: {
            // used to generate the default data for the struct
            id: (): string => 'my-id',
            attributes: (): string[] => ['name', 'age']
        },

        // if true and the struct is initialized, it will crash the program
        // This is useful to showcase the purpose of structs without accidentally using them and applying undesired data into the database
        sample: true,

        // if true, the data cannot enter into more than 2 universes (defaults to 1)
        universeLimit: 2,
    });
}
```
