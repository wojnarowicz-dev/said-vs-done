// A witness for the fixture's response promise.
import nodemailer from 'nodemailer';

export async function replyToAccount(address, body) {
    const transport = nodemailer.createTransport({ host: 'smtp.example.test' });
    return transport.sendMail({ to: address, subject: 'Re: your report', text: body });
}
