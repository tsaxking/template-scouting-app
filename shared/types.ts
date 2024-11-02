export class Timestamp extends String {
    static from(value: string | number | Date) {
        if (value instanceof Date) {
            return new Timestamp(value.toISOString());
        }

        if (typeof value === 'number') {
            return new Timestamp(new Date(value).toISOString());
        }

        return new Timestamp(value);
    }

    toDate() {
        return new Date(this.toString());
    }
}

export class Int extends Number {
    static from(value: string | number) {
        return new Int(parseInt(value.toString()));
    }

    constructor(value: number) {
        super(value);

        this.valueOf = () => {
            return parseInt(this.toString());
        };
    }
}

Int.prototype.valueOf = function () {
    return parseInt(this.toString());
};
