// src/server.ts
import { Octokit } from "@octokit/rest";
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
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
    PORT: 3000
} as const;

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

const app = express();
app.use(bodyParser.json());

const bot = new Octokit({ auth: CONFIG.GITHUB_TOKEN });

// 签名验证中间件
const verifySignature = (req: Request, res: Response, next: NextFunction) => {
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
        Logger.warn(`Signature verification failed.\nExpected ${expectedSignature} but ${signature} found.`, this);
        res.status(401).send("Invalid signature");
        return;
    }

    next();
};

// 事件路由处理
const handleWebhookEvent = async (event: string, payload: WebhookPayload) => {
    Logger.info(`Event received: ${event} [${payload.action}]`, this);

    const matchedHandlers = eventHandlers.filter(handler =>
        handler.eventType === event &&
        (handler.action ? handler.action === payload.action : true) &&
        (!handler.condition || handler.condition(payload)) &&
        payload.sender.login !== 'PCL-Community-Bot'
    );

    if (matchedHandlers.length === 0) {
        Logger.info(`No matching handler`, this);
        return;
    }

    Logger.info(`There are ${matchedHandlers.length} handlers found.`, this);

    for (const handler of matchedHandlers) {
        try {
            await handler.handle(payload, bot);
            Logger.info(`Handler ${handler.eventType}.${handler.action} ended normally.`, this);
        } catch (error) {
            Logger.error(`Handler exited with an error: ${error instanceof Error ? error.message : error}`, this);
        }
    }
};

app.use(verifySignature);

app.post("/webhook", async (req: Request, res: Response) => {
    const event = req.headers["x-github-event"] as string;

    try {
        await handleWebhookEvent(event, req.body);
        res.status(200).json({
            error: null,
            message: "success"
        });
    } catch (error) {
        Logger.error(`Error: ${error}`, this);
        res.status(500).json({
            error: error,
            message: "failed"
        });
    }
});

app.listen(CONFIG.PORT, () => {
    Logger.info(`Server started at http://localhost:${CONFIG.PORT}`, this);
    Logger.info("Current environment variables:", this);
    Object.entries(CONFIG).forEach(([k, v]) => Logger.info(`🔒 ${k}=${v}`), this);
    Logger.info(`Registered handlers: `, this);
    eventHandlers.forEach(h =>
        Logger.info(`▸ ${h.eventType}.${h.action || '*'}`, this)
    );
});