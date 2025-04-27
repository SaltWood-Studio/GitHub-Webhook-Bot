import { WebhookEventHandler } from "./handler/base.js";

export class Logger {
    public static info(...args: any[]) {
        console.log(Logger.format(...args), this);
    }

    public static warn(...args: any[]) {
        console.warn(Logger.format(...args), this);
    }

    public static error(...args: any[]) {
        console.error(Logger.format(...args));
    }

    private static format(...args: any[]): string {
        let instance: WebhookEventHandler | null = null;
        if (args.at(-1) instanceof WebhookEventHandler) {
            instance = args.at(-1);
            args = args.slice(0, args.length - 1);
        }
        const header = instance ? `${instance?.action ?? '-'} [${instance?.eventType ?? '-'}]` : 'Main';
        return `[${new Date().toISOString()}] <${header}> ${args.join(" ")}`;
    }
}