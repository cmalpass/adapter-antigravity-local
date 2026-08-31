import { afterEach, describe, expect, it, vi } from "vitest";
import { execute } from "../../src/server/execute.js";

const {
  runAdapterExecutionTargetProcess,
  ensureAdapterExecutionTargetCommandResolvable,
  resolveAdapterExecutionTargetCommandForLogs,
} = vi.hoisted(() => ({
  runAdapterExecutionTargetProcess: vi.fn(async () => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdout: "Success",
    stderr: "",
    pid: 123,
    startedAt: new Date().toISOString(),
  })),
  ensureAdapterExecutionTargetCommandResolvable: vi.fn(async () => undefined),
  resolveAdapterExecutionTargetCommandForLogs: vi.fn(async () => "/usr/local/bin/agy"),
}));

vi.mock("@paperclipai/adapter-utils/execution-target", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/execution-target")>(
    "@paperclipai/adapter-utils/execution-target",
  );
  return {
    ...actual,
    runAdapterExecutionTargetProcess,
    ensureAdapterExecutionTargetCommandResolvable,
    resolveAdapterExecutionTargetCommandForLogs,
  };
});

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/server-utils")>(
    "@paperclipai/adapter-utils/server-utils",
  );
  return {
    ...actual,
    ensureAbsoluteDirectory: vi.fn(async () => undefined),
  };
});

/**
 * Integration test suite for the local Antigravity execution flow.
 * Mocks the system process spawn APIs to assert correct argument building, 
 * environment variables injection, and multi-workspace support.
 */
describe("antigravity local execution", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Assures that a basic local run correctly resolves and spawns the `agy` process
   * with the expected prompt and unattended permission flags.
   */
  it("successfully invokes agy with local command, correct prompt, and json output format", async () => {
    const result = await execute({
      runId: "run-local-1",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Antigravity CEO",
        adapterType: "antigravity_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "agy",
      },
      context: {
        paperclipWorkspace: {
          cwd: "/home/user/workspace",
          source: "project_primary",
        },
      },
      onLog: async () => {},
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toBe("Success");
    expect(runAdapterExecutionTargetProcess).toHaveBeenCalledTimes(1);

    const callArgs = runAdapterExecutionTargetProcess.mock.calls[0] as unknown as [string, unknown, string, string[]];
    const cliArgs = callArgs[3];
    expect(cliArgs).toContain("--print");
    expect(cliArgs).toContain("--output-format");
    expect(cliArgs).toContain("json");
    expect(cliArgs).toContain("--dangerously-skip-permissions");
  });

  /**
   * Asserts that model selection is correctly compiled to `--model` and `--effort` CLI parameters
   * as well as `env.ANTIGRAVITY_MODEL`.
   */
  it("configures model via CLI flags and env.ANTIGRAVITY_MODEL", async () => {
    await execute({
      runId: "run-local-2",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Antigravity CEO",
        adapterType: "antigravity_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "agy",
        model: "gemini-3.7-flash-high",
      },
      context: {
        paperclipWorkspace: {
          cwd: "/home/user/workspace",
          source: "project_primary",
        },
      },
      onLog: async () => {},
    });

    const callArgs = runAdapterExecutionTargetProcess.mock.calls[0] as unknown as [string, unknown, string, string[], { env: Record<string, string> }];
    const cliArgs = callArgs[3];
    const options = callArgs[4];

    expect(cliArgs).toContain("--model");
    expect(cliArgs[cliArgs.indexOf("--model") + 1]).toBe("gemini-3.7-flash");
    expect(cliArgs).toContain("--effort");
    expect(cliArgs[cliArgs.indexOf("--effort") + 1]).toBe("high");
    expect(options.env.ANTIGRAVITY_MODEL).toBe("gemini-3.7-flash-high");
  });

  /**
   * Asserts that structured JSON responses parse conversation ID and usage tokens.
   */
  it("parses structured JSON output for session resumption and token metrics", async () => {
    runAdapterExecutionTargetProcess.mockResolvedValueOnce({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: JSON.stringify({
        conversation_id: "conv-unique-999",
        status: "SUCCESS",
        response: "Executed successfully.",
        usage: {
          input_tokens: 1200,
          output_tokens: 350,
          cache_read_tokens: 400,
        },
      }),
      stderr: "",
      pid: 124,
      startedAt: new Date().toISOString(),
    });

    const result = await execute({
      runId: "run-local-json",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Antigravity CEO",
        adapterType: "antigravity_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "agy",
      },
      context: {
        paperclipWorkspace: {
          cwd: "/home/user/workspace",
          source: "project_primary",
        },
      },
      onLog: async () => {},
    });

    expect(result.summary).toBe("Executed successfully.");
    expect(result.sessionId).toBe("conv-unique-999");
    expect(result.usage.inputTokens).toBe(1200);
    expect(result.usage.outputTokens).toBe(350);
    expect(result.usage.cachedInputTokens).toBe(400);
  });

  /**
   * Asserts that multiple active workspaces are mapped correctly using
   * repeatable `--add-dir` flags on the spawned command line.
   */
  it("appends multiple workspaces using repeatable --add-dir CLI flags", async () => {
    await execute({
      runId: "run-local-3",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Antigravity CEO",
        adapterType: "antigravity_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "agy",
      },
      context: {
        paperclipWorkspace: {
          cwd: "/home/user/workspace-1",
          source: "project_primary",
        },
        paperclipWorkspaces: [
          { cwd: "/home/user/workspace-1" },
          { cwd: "/home/user/workspace-2" },
        ],
      },
      onLog: async () => {},
    });

    const callArgs = runAdapterExecutionTargetProcess.mock.calls[0] as unknown as [string, unknown, string, string[]];
    const cliArgs = callArgs[3];

    let addDirIndices: number[] = [];
    cliArgs.forEach((arg, idx) => {
      if (arg === "--add-dir") addDirIndices.push(idx);
    });

    expect(addDirIndices.length).toBe(2);
    expect(cliArgs[addDirIndices[0] + 1]).toBe("/home/user/workspace-1");
    expect(cliArgs[addDirIndices[1] + 1]).toBe("/home/user/workspace-2");
  });
});

