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
import { PullRequestMergedHandler, PullRequestReopenedHandler } from "./handler/pr-handler.js";
import { Logger } from "./logger.js";

// 麻了 TypeScript 没有 #region，看起来好难受

// ==================== 配置段 ====================
export const CONFIG = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN as string,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET as string,
    PORT: parseInt(process.env.PORT!) || 3000,
    DEBUG: ["true", "1"].some(i => i === process.env.DEBUG?.toLowerCase()),
    TRUST_PROXY: ["true", "1"].some(i => i === process.env.TRUST_PROXY?.toLowerCase())
} as const;

if (!CONFIG.GITHUB_TOKEN || !CONFIG.WEBHOOK_SECRET) {
    Logger.error("Missing required environment variables!");
    process.exit(1);
}

// ==================== Express 初始化 ====================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== 全局设置 ====================
if (CONFIG.DEBUG) {
    Logger.debugMode = true;
}

if (CONFIG.TRUST_PROXY) app.set('trust proxy', true);

// ==================== GitHub 客户端 ====================
const bot = new Octokit({ auth: CONFIG.GITHUB_TOKEN });
bot.log.debug = Logger.debug;
bot.log.info = Logger.info;
bot.log.warn = Logger.warn;
bot.log.error = Logger.error;

// ==================== 中间件 ====================
function logAccess(req: Request, res: Response, next: NextFunction) {
    next();
    res.on('finish', () => {
        const userAgent = req.headers['user-agent'] ?? '';
        Logger.info(`${req.method} ${req.originalUrl} ${req.protocol} <${res.statusCode}> - [${req.ip}] ${userAgent}`);
    });
};

function verifySignature(req: Request, res: Response, next: NextFunction): void {
    if (!req.headers["x-hub-signature-256"]) {
        res.status(401).json({ error: "This API can only be used by GitHub.", code: 400 }).send();
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

// ==================== 事件处理器 ====================
const eventHandlers: WebhookEventHandler[] = [
    new IssueCompletedHandler(),
    new IssueDuplicatedHandler(),
    new IssueInvalidHandler(),
    new UpstreamLabelHandler(),
    new CompletedLabelHandler(),
    new IssueReopenedHandler(),
    new PullRequestMergedHandler(),
    new RejectionLabelHandler(),
    new PullRequestReopenedHandler()
];

// ==================== 路由处理 ====================
function handleWebhookEvent(event: string, payload: WebhookPayload): void {
    const id = payload.pull_request?.number || payload.issue?.number || null;
    Logger.info(`${id !== null ? `#${id} ` : ""}${event}${payload.action ? `.${payload.action}` : ''} event triggered by ${payload.sender.login ?? '<SYSTEM>'} in ${payload.repository.full_name}`);

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

// ==================== 服务器控制 ====================
let server: ReturnType<typeof app.listen>;

function handleExit(signal: string) {
    Logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
        Logger.info("Server stopped");
        process.exit(0);
    });
}

process.on('SIGTERM', () => handleExit('SIGTERM'));
process.on('SIGINT', () => handleExit('SIGINT'));

// ==================== 路由注册 ====================
app.use(logAccess);
app.use(verifySignature);

app.post("/webhook", async (req: Request, res: Response) => {
    const event = req.headers["x-github-event"] as string;
    try {
        handleWebhookEvent(event, req.body);
        res.status(200).json({ error: null, message: "success" });
    } catch (error) {
        Logger.error(`Error: ${error}`);
        res.status(500).json({ error: error, message: "failed" });
    }
});

// ==================== 启动服务 ====================
server = app.listen(CONFIG.PORT, () => {
    Logger.info(`Server started at http://localhost:${CONFIG.PORT}`);
    Logger.debug("Current environment variables:");
    Object.entries(CONFIG).forEach(([k, v]) => Logger.debug(`-> ${k}=${v}`));
    Logger.info(`Registered handlers: `);
    eventHandlers.forEach(h => Logger.info(`- ${h.eventType}.${h.action || '*'}`));
});