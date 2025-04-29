// src/server.ts
import { Octokit } from "@octokit/rest";
import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { IssueCompletedHandler } from "./handler/issue-closed-completed.js";
import { WebhookEventHandler } from "./handler/base.js";
import { WebhookPayload } from "./types.js";
import { IssueDuplicatedHandler } from "./handler/issue-closed-duplicated.js";
import { IssueInvalidHandler } from "./handler/issue-closed-not-planned.js";
import { CompletedLabelHandler, RejectionLabelHandler, UpstreamLabelHandler } from "./handler/issue-labeled.js";
import { IssueReopenedHandler } from "./handler/issue-reopened.js";
import { MergedPRHandler, ReopenedPRHandler } from "./handler/pr-handler.js";
import { Logger } from "./logger.js";

// 配置
export const CONFIG = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN as string,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET as string,
    PORT: 3000,
    DEBUG: ["true", "1"].some(i => i === process.env.DEBUG?.toLowerCase()),
    TRUST_PROXY: process.env.TRUST_PROXY as string
} as const;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (CONFIG.DEBUG) {
    Logger.debugMode = true;
}

if (["true", "1"].some(i => i === CONFIG.TRUST_PROXY)) {
    app.set('trust proxy', true);
}

// 注册事件处理器
const eventHandlers: WebhookEventHandler[] = [
    new IssueCompletedHandler(),
    new IssueDuplicatedHandler(),
    new IssueInvalidHandler(),
    new UpstreamLabelHandler(),
    new CompletedLabelHandler(),
    new IssueReopenedHandler(),
    new MergedPRHandler(),
    new RejectionLabelHandler(),
    new ReopenedPRHandler()
];

const bot = new Octokit({ auth: CONFIG.GITHUB_TOKEN });

function logAccess(req: Request, res: Response, next: NextFunction) {
    next();

    res.on('finish', () => {
        const userAgent = req.headers['user-agent'] ?? '';
        Logger.info(`${req.method} ${req.originalUrl} ${req.protocol} <${res.statusCode}> - [${req.ip}] ${userAgent}`);
    });
};

// 签名验证中间件
function verifySignature(req: Request, res: Response, next: NextFunction): void {
    if (!req.headers["x-hub-signature-256"]) {
        res.status(401).json({
            error: "This API can only be used by GitHub.",
            code: 400
        }).send();
        return;
    }
    const signature = req.headers["x-hub-signature-256"];

    const hmac = crypto.createHmac("sha256", CONFIG.WEBHOOK_SECRET);
    const digest = hmac.update(JSON.stringify(req.body)).digest("hex");
    const expectedSignature = `sha256=${digest}`;

    if (signature !== expectedSignature) {
        Logger.warn(`Signature verification failed.\nExpected ${expectedSignature} but ${signature} found.`);
        res.status(401).send("Invalid signature");
        return;
    }

    next();
};

app.use(logAccess);
app.use(verifySignature);

// 事件路由处理
function handleWebhookEvent(event: string, payload: WebhookPayload): void {
    const id = payload.pull_request?.number || payload.issue?.number || null;
    Logger.info(`${id !== null ? `#${id} ` : ""}${event}.${payload.action} triggered by ${payload.sender.login ?? '<SYSTEM>'} in ${payload.repository.full_name}`);

    const matchedHandlers = eventHandlers.filter(handler =>
        handler.eventType === event &&
        (handler.action ? handler.action === payload.action : true) &&
        (!handler.condition || handler.condition(payload)) &&
        payload.sender.login !== 'PCL-Community-Bot'
    );

    if (matchedHandlers.length === 0) {
        Logger.info(`No matching handler`);
        return;
    }

    Logger.info(`There are ${matchedHandlers.length} handlers found.`);

    for (const handler of matchedHandlers) {
        handler.handle(payload, bot)
            .then(() => Logger.info(`Handler ${handler.eventType}.${handler.action} ended normally.`))
            .catch((error) => {
                Logger.error(`Handler exited with an error: ${error instanceof Error ? error.message : error}`);
            });
    }
};

app.post("/webhook", async (req: Request, res: Response) => {
    const event = req.headers["x-github-event"] as string;

    try {
        handleWebhookEvent(event, req.body);
        res.status(200).json({
            error: null,
            message: "success"
        });
    } catch (error) {
        Logger.error(`Error: ${error}`);
        res.status(500).json({
            error: error,
            message: "failed"
        });
    }
});

app.listen(CONFIG.PORT, () => {
    Logger.info(`Server started at http://localhost:${CONFIG.PORT}`);
    Logger.debug("Current environment variables:");
    Object.entries(CONFIG).forEach(([k, v]) => Logger.debug(`-> ${k}=${v}`));
    Logger.info(`Registered handlers: `);
    eventHandlers.forEach(h =>
        Logger.info(`- ${h.eventType}.${h.action || '*'}`)
    );
});