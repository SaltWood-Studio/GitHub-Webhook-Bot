import { Octokit } from "@octokit/rest";
import { Permission, permissions } from "../types.js";
import { Logger } from "../logger.js";

// 定义泛型事件处理器接口
export abstract class WebhookEventHandler<T = any> {
    /**
     * GitHub 事件类型
     * @example "issues" | "pull_request" | "star"
     */
    abstract eventType: string;

    /**
     * 事件子动作类型 (可选)
     * @example "opened" | "closed" | "reopened"
     */
    abstract action?: string;

    /**
     * 处理函数
     * @param payload - GitHub Webhook 的有效载荷
     * @param octokit - 认证的 Octokit 实例
     */
    async handle(payload: T, octokit: Octokit): Promise<void> {
        Logger.warn(`WebhookEventHandler: Default implementation invoked.`);
    }

    /**
     * 自定义条件检查 (可选)
     * 一般为一个 lambda 表达式，因为 condition 一般比较简单
     * @returns 是否执行该处理器
     */
    condition?: (payload: T) => boolean = () => true;
}

export class Utilities {
    public static hasPermission(target: Permission, actual: Permission): boolean {
        return permissions.indexOf(target) <= permissions.indexOf(actual)
    }
}