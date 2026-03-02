import { ConsoleLogger, GetError } from "@kwiz/common";
import { createTransport } from "nodemailer";

export type mailType = {
    name: string;
    address: string;
} | string;
export type mailsType = mailType | mailType[];
export async function sendEmail(cfg: { login: string; password: string; }, info: {
    /** from address is always info */
    fromName: string;
    to: mailsType;
    cc?: mailsType;
    bcc?: mailsType;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
}) {
    const logger = ConsoleLogger.get("send-email");
    try {
        const email_user = cfg.login;
        const email_password = cfg.password;
        const mailTransport = createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: { user: email_user, pass: email_password },
            tls: { ciphers: 'SSLv3' }
        });

        const result = await mailTransport.sendMail({
            from: { address: email_user, name: info.fromName },
            to: info.to,
            cc: info.cc,
            bcc: info.bcc,
            replyTo: email_user,
            subject: info.subject,
            html: info.bodyHtml,
            text: info.bodyText
        });
        return result.response;
    } catch (err) {
        logger.error(err);
        return GetError(err, "send365Email: An error occurred");
    }
}
