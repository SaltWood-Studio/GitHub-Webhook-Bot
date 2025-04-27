import { Octokit } from "@octokit/rest";
import { Permission, permissions } from "../types.js";

// 定义泛型事件处理器接口
export abstract class WebhookEventHandler<T = any> {
    /**
     * GitHub 事件类型 (必填)
     * @example "issues" | "pull_request" | "star"
     */
    abstract eventType: string;

    /**
     * 事件子动作类型 (可选)
     * @example "opened" | "closed" | "reopened"
     */
    abstract action?: string;

    /**
     * 处理函数 (核心)
     * @param payload - GitHub Webhook 的有效载荷
     * @param octokit - 认证的 Octokit 实例
     */
    abstract handle: (payload: T, octokit: Octokit) => Promise<void>;

    /**
     * 优先级 (可选，默认 0)
     * 数值越小优先级越高
     */
    abstract priority?: number;

    /**
     * 自定义条件检查 (可选)
     * @returns 是否执行该处理器
     */
    abstract condition?: (payload: T) => boolean;
}

export class Utilities {
    public static hasPermission(target: Permission, actual: Permission): boolean {
        return permissions.indexOf(target) <= permissions.indexOf(actual)
    }
}