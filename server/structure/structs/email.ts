import { DB } from '../../utilities/database';
import { Struct } from './struct';
import nodemailer from 'nodemailer';
import { sgTransport } from '@neoxia-js/nodemailer-sendgrid-transport';
import env from '../../utilities/env';
export namespace Email {
    const transporter = nodemailer.createTransport(
        sgTransport({
            auth: {
                apiKey: env.SENDGRID_API_KEY || ''
            }
        })
    );

    export const Email = new Struct({
        database: DB,
        name: 'Email',
        structure: {
            type: 'text',
            to: 'text', // string[]
            clicked: 'boolean',
            link: 'text'
        }
    });
}
