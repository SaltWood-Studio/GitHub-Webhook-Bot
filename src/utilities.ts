import { Octokit } from "@octokit/rest";
import { Logger } from "./logger.js";

export async function removeLabels(octokit: Octokit, issue: { owner: string, repo: string, issue_number: number }, labels: string[]): Promise<void> {
    await Promise.all(labels.map(name =>
        octokit.issues.removeLabel({ ...issue, name }).catch(Logger.debug)
    ));
}