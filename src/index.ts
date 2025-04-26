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
        console.warn(`⚠️ 签名验证失败\n预期: ${expectedSignature}\n实际: ${signature}`);
        res.status(401).send("Invalid signature");
        return;
    }

    next();
};

// 事件路由处理
const handleWebhookEvent = async (event: string, payload: WebhookPayload) => {
    console.log(`📩 收到事件: ${event} [${payload.action}]`);

    const matchedHandlers = eventHandlers.filter(handler =>
        handler.eventType === event &&
        (handler.action ? handler.action === payload.action : true) &&
        (!handler.condition || handler.condition(payload)) &&
        payload.sender.login !== 'PCL-Community-Bot'
    );

    if (matchedHandlers.length === 0) {
        console.log(`⏩ 无匹配处理器，跳过处理`);
        return;
    }

    console.log(`🔧 找到 ${matchedHandlers.length} 个匹配处理器`);

    for (const handler of matchedHandlers) {
        try {
            await handler.handle(payload, bot);
            console.log(`✔️ 处理器 ${handler.eventType}.${handler.action} 执行成功`);
        } catch (error) {
            console.error(`❌ 处理器执行失败: ${error instanceof Error ? error.message : error}`);
        }
    }
};

app.use(verifySignature);

app.post("/webhook", async (req: Request, res: Response) => {
    const event = req.headers["x-github-event"] as string;

    try {
        await handleWebhookEvent(event, req.body);
        res.status(200).send("事件处理完成");
    } catch (error) {
        console.error(`💥 全局错误: ${error}`);
        res.status(500).send("服务器内部错误");
    }
});

app.listen(CONFIG.PORT, () => {
    console.log(`🎯 服务已启动 http://localhost:${CONFIG.PORT}`);
    console.log(`已注册处理器列表：`);
    eventHandlers.forEach(h =>
        console.log(`▸ ${h.eventType}.${h.action || '*'}`)
    );
});