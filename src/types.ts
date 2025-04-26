export interface WebhookPayload {
    repository: {
        owner: User;
        name: string;
        full_name: string;
    };
    issue?: Issue;
    sender: User;
    action?: string;
    pull_request?: PullRequest;
};

export interface User {
    avatar_url?: string;
    deleted?: boolean;
    email?: string | null;
    events_url?: string;
    followers_url?: string;
    following_url?: string;
    gists_url?: string;
    gravatar_id?: string;
    html_url?: string;
    id: number;
    login: string;
    name?: string;
    node_id?: string;
    organizations_url?: string;
    received_events_url?: string;
    repos_url?: string;
    site_admin?: boolean;
    starred_url?: string;
    subscriptions_url?: string;
    type: "Bot" | "User" | "Organization" | "Mannequin";
    url?: string;
    user_view_type?: string;
}

export interface License {
    key: string;
    name: string;
    spdx_id?: string;
    url?: string;
    node_id: string;
}

export interface Permissions {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
}

export interface Repository {
    // 基础配置
    allow_auto_merge?: boolean;
    allow_forking?: boolean;
    allow_merge_commit?: boolean;
    allow_rebase_merge?: boolean;
    allow_squash_merge?: boolean;
    allow_update_branch?: boolean;

    // 仓库状态
    archived: boolean;
    disabled?: boolean;
    is_template?: boolean;
    private: boolean;
    visibility: "public" | "private" | "internal";

    // 合并配置
    delete_branch_on_merge?: boolean;
    merge_commit_message?: "PR_BODY" | "PR_TITLE" | "BLANK";
    merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
    squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
    squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
    use_squash_pr_title_as_default?: boolean;  // @deprecated 使用 squash_merge_commit_title 替代

    // 基础信息
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    owner: User | null;
    description: string | null;
    homepage: string | null;

    // 时间信息
    created_at: string | number;
    updated_at: string;
    pushed_at: string | number | null;

    // 统计信息
    forks_count: number;
    stargazers_count: number;
    watchers_count: number;
    open_issues_count: number;
    size: number;

    // 功能开关
    has_issues: boolean;
    has_projects: boolean;
    has_wiki: boolean;
    has_downloads: boolean;
    has_pages: boolean;
    has_discussions: boolean;

    // URL 集合
    html_url: string;
    clone_url: string;
    git_url: string;
    ssh_url: string;
    svn_url: string;

    // 分支配置
    default_branch: string;
    master_branch?: string;

    // 权限相关
    permissions?: Permissions;
    role_name?: string | null;

    // 其他元数据
    license: License | null;
    topics: string[];
    language: string | null;
    web_commit_signoff_required?: boolean;
}

// 里程碑类型
interface Milestone {
    node_id: string;
    number: number;
    title: string;
    description: string | null;
    state: 'open' | 'closed';
}

// 反应统计
interface Reactions {
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
}

// Issue 锁定原因
type LockReason = 'resolved' | 'off-topic' | 'too heated' | 'spam' | null;

// 作者关联类型
type AuthorAssociation =
    | 'COLLABORATOR'
    | 'CONTRIBUTOR'
    | 'FIRST_TIMER'
    | 'FIRST_TIME_CONTRIBUTOR'
    | 'MANNEQUIN'
    | 'MEMBER'
    | 'NONE'
    | 'OWNER';

// 主 Issue 类型
interface Issue {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    state_reason: 'completed' | 'not_planned' | 'duplicate' | null;
    locked: boolean;
    active_lock_reason: LockReason;
    comments: number;
    comments_url: string;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    author_association: AuthorAssociation;
    user: User | null;
    labels: Array<{
        id: number;
        name: string;
        color: string;
        description?: string;
    }>;
    assignee: User | null;
    assignees: User[];
    milestone: Milestone | null;
    performed_via_github_app: any | null; // 可进一步定义具体类型
    reactions: Reactions;
    timeline_url: string;
    pull_request?: PullRequest;
}

interface PullRequest {
    assignee?: User;
    assignees?: User[];
    auto_merge: boolean;
    base: Base;
    body: string;
    comments: number;
    commits: number;
    changed_files: number;
    additions: number;
    deletions: number;
    created_at: string;
    number: number;
    merged: boolean;
}

/**
 * Git 仓库引用信息
 */
export interface Base {
    // SHA 哈希值
    sha: string;
    // 关联用户信息
    user: User | null;
    // 标签名称
    label: string;
    // Git 引用路径
    ref: string;
    // 关联的仓库信息
    repo: Repository;
}

export const permissions: string[] = [
    "none",
    "read",
    "triage",
    "write",
    "maintain",
    "admin"
];
export type Permission = typeof permissions[number];

export const label = {
    // 关闭原因标签
    ignored: '❌ 忽略',
    rejected: '❌ 拒绝 / 放弃',
    not_planned: '❌ 暂无计划',
    third_party: '❌ 第三方',
    timeout: '❌ 超时关闭',
    duplicate: '❌ 重复',

    // 状态标签
    completed: '👌 完成',
    waiting: '⭕ 等待处理',
    processing: '🚧 正在处理',
    wait_merge: '🕑 等待合并',
    wait_dependency: '🕑 等待前置',

    // 分类标签
    breaking_change: '❗ 破坏性',
    high_quality: '👍 优质',
    need_info: '💬 信息补充',
    need_reproduce: '💬 需要复现',
    need_help: '💬 需要帮助',
    upstream: '😂 移交上游'
};
export type Label = keyof typeof label;

export const labels = {
    waiting: [label.waiting, label.processing, label.wait_merge, label.wait_dependency]
};