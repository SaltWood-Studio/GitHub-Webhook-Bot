<div align="center">

# GitHub-Webhook-Bot
✨🎉 **基于 Octokit 和 Webhook 的 GitHub 事件自动化处理机器人** 🎉✨
</div>

# 简介
使用 [OctoKit](https://github.com/octokit) 和 Webhook 实现的 GitHub 事件自动化处理机器人

# 自定义
1. 点击右上角 Use this template
2. 点击 Create a new repository
3. 创建仓库
4. 在 `src/handler` 下创建你的 Handler（继承自 `WebhookEventHandler<WebhookPayload>`）
5. 在 `index.ts` 下添加 `new YourCustomHandler()`

# 使用
## 1. 使用 Docker Compose
1. 克隆项目
2. 配置 `.env` 文件（示例文件为 `.env.production`）
3. 运行 `docker compose up -d --build`
4. 此后每次更新，需要拉取最新更改，然后运行第三步所给的指令重新构建镜像

## 2. 使用 Node.JS
1. 克隆项目
2. 配置 `.env` 文件（示例文件为 `.env.production`）
3. 运行 `npm run build` 构建项目
4. 运行 `npm run start` 启动程序

# 配置
本程序为无配置文件设计，所有行为通过环境变量控制。

| 环境变量名称      | 类型        | 必填  | 默认值        | 作用描述                                                             |
|------------------|-------------|-------|--------------|----------------------------------------------------------------------|
| `GITHUB_TOKEN`   | `string`    | 是    | -            | GitHub API 认证令牌                                                   |
| `WEBHOOK_SECRET` | `string`    | 是    | -            | GitHub Webhook 的签名密钥                                             |
| `PORT`           | `number`    | 否    | `3000`       | 服务监听端口                                                          |
| `DEBUG`          | `boolean`   | 否    | `false`      | 调试模式                                                             |
| `TRUST_PROXY`    | `boolean`   | 否    | `false`      | 信任反向代理头部                                                      |