/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from '../../shared/event-emitter';
import { ServerFunction } from '../structure/app/app';
import { Req } from '../structure/app/req';

/**
 * Options for the validate function
 * @date 1/9/2024 - 1:16:19 PM
 *
 * @typedef {ValidateOptions}
 */
type ValidateOptions = {
    allowExtra?: boolean;

    /**
     * Called when a value is invalid
     * @param key
     * @param value
     * @returns
     */
    onInvalid?: (key: string, value: any) => void;

    /**
     * Called when a value is missing
     * @param key
     * @returns
     */
    onMissing?: (key: string) => void;

    log?: true;
};

/**
 * Allowed primitive types
 * @date 3/8/2024 - 6:21:58 AM
 *
 * @typedef {AllowedPrimitive}
 */
type AllowedPrimitive = 'string' | 'number' | 'boolean' | 'undefined';

/**
 * A check to see if a value is valid
 * @date 3/8/2024 - 6:21:58 AM
 *
 * @typedef {IsValid}
 */
type IsValid<T> =
    | AllowedPrimitive
    | AllowedPrimitive[]
    | (string | number | boolean)[]
    | ((data: any, body: T) => boolean);

/**
 * Event emitter for data validation
 * @date 3/8/2024 - 6:21:58 AM
 *
 * @type {EM}
 */
export const emitter = (() => {
    type Reason =
        | 'invalid-primitive-array'
        | 'invalid-normal-array'
        | 'invalid-non-primitive'
        | 'invalid-primitive'
        | 'missing-key';

    class DataValidationFaliure<T> {
        constructor(
            public readonly type: T,
            public readonly data: [string, unknown, IsValid<unknown>],
            public readonly url: string,
            public readonly method: string,
            public readonly reason: Reason
        ) {}
    }

    type Events = {
        fail: DataValidationFaliure<'fail'>;
    };

    class EM extends EventEmitter<Events> {
        throw<K extends keyof Events>(
            event: K,
            data: Events[K]['data'],
            req: Req,
            reason: Reason
        ): void {
            const e = new DataValidationFaliure(
                event,
                data,
                req.url,
                req.method,
                reason
            );
            super.emit(event, e);
        }
    }

    return new EM();
})();

/**
 * Creates a middleware function that validates the req.body, ensuring that all data is both present and the correct type
 * @date 1/9/2024 - 1:16:19 PM
 */
export const validate = <type = unknown>(
    data: {
        // each key is a key in the type generic
        [key in keyof type]: IsValid<type>;
    },
    options?: ValidateOptions
): ServerFunction<type> => {
    return (req, res, next) => {
        let { body } = req;

        // body can be stored here because it could be a file stream
        if (!Object.entries(body as any).length) {
            body = JSON.parse(req.headers.get('x-body') || '{}') as type;
        }

        let passed = true;
        const missing: string[] = [];
        const failed: string[] = [];

        for (const [key, isValid] of Object.entries(data)) {
            const log = (...args: any[]) => {
                if (options?.log) console.log('[validate]', key, ...args);
            };

            if (!body || (body as any)[key] === undefined) {
                passed = false;
                missing.push(key);
                emitter.throw(
                    'fail',
                    [key, (body as any)[key], isValid as IsValid<unknown>],
                    req,
                    'missing-key'
                );
                continue;
            }

            // is it an array?
            if (Array.isArray(isValid)) {
                log('is array');
                // is it a primitive array?
                const isPrimitive = isValid.every(value =>
                    ['string', 'number', 'boolean'].includes(
                        value as AllowedPrimitive
                    )
                );
                // if not, it's just a normal array

                if (isPrimitive) {
                    log('is primitive array');
                    if (
                        !(isValid as AllowedPrimitive[]).includes(
                            typeof (body as any)[key] as AllowedPrimitive
                        )
                    ) {
                        log('invalid primitive array');
                        // invalid, not a primitive
                        passed = false;
                        failed.push(key);
                        emitter.throw(
                            'fail',
                            [
                                key,
                                (body as any)[key],
                                isValid as IsValid<unknown>
                            ],
                            req,
                            'invalid-primitive-array'
                        );
                        continue;
                    }
                } else {
                    log('is normal array');
                    if (isValid.includes((body as any)[key] as never)) {
                        log('valid normal array');
                        // valid
                        continue;
                    } else {
                        log('invalid normal array');
                        // invalid
                        passed = false;
                        failed.push(key);
                        emitter.throw(
                            'fail',
                            [
                                key,
                                (body as any)[key],
                                isValid as IsValid<unknown>
                            ],
                            req,
                            'invalid-normal-array'
                        );
                        continue;
                    }
                }
            } else {
                log('is not array');
                // is it a primitive?
                const isPrimitive = ['string', 'number', 'boolean'].includes(
                    isValid as unknown as AllowedPrimitive
                );

                if (isPrimitive) {
                    log('is primitive');
                    if (typeof (body as any)[key] !== isValid) {
                        log('invalid primitive');
                        // invalid, not a primitive
                        passed = false;
                        failed.push(key);
                        emitter.throw(
                            'fail',
                            [
                                key,
                                (body as any)[key],
                                isValid as IsValid<unknown>
                            ],
                            req,
                            'invalid-primitive'
                        );
                        continue;
                    }
                } else {
                    log('is not primitive');
                    if (
                        (isValid as (data: any, body: any) => boolean)(
                            (body as any)[key],
                            body
                        )
                    ) {
                        log('valid non-primitive');
                        // valid
                        continue;
                    } else {
                        log('invalid non-primitive');
                        passed = false;
                        failed.push(key);
                        emitter.throw(
                            'fail',
                            [
                                key,
                                (body as any)[key],
                                isValid as IsValid<unknown>
                            ],
                            req,
                            'invalid-non-primitive'
                        );
                        continue;
                    }
                }
            }
        }

        if (passed) return next();

        if (options?.onInvalid) {
            for (const key of failed) {
                options.onInvalid(key, (body as any)[key]);
            }
        }

        if (options?.onMissing) {
            for (const key of missing) {
                options.onMissing(key);
            }
        }

        return res.sendStatus('server:invalid-data', body);
    };
};

/**
 * Pipes the body through a function
 * @date 3/8/2024 - 6:21:58 AM
 *
 * @template T
 * @param {(value: T) => T} pipe
 * @returns {T) => (req: Req<T>, res: any, next: any) => void}
 */
export const bodyPipe = <T>(pipe: (value: T) => T) => {
    return (req: Req<T>, res: any, next: any) => {
        req.body = pipe(req.body);
        next();
    };
};

/**
 * Trims the body
 * @date 3/8/2024 - 6:21:58 AM
 *
 * @type {(req: Req<{ [key: string]: string; }>, res: any, next: any) => void}
 */
export const trimBody = bodyPipe(
    (body: {
        [key: string]: string;
    }): {
        [key: string]: string;
    } => {
        for (const key in body) {
            body[key] = body[key].trim();
        }
        return body;
    }
);
