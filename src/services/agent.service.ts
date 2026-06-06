import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  Tool,
  Part,
} from "@google/generative-ai";
import * as AgentRepository from "../repositories/agent.repository";
import * as TaskRepository from "../repositories/task.repository";
import { AppError } from "../utils/response";
import { ToolCall } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Tool schemas (what Gemini can call) ─────────────────────────────────────

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "create_task",
    description: "Create a new task for the user",
    parameters: {
      type: "object" as any,
      properties: {
        title: {
          type: "string" as any,
          description: "Short title of the task",
        },
        description: {
          type: "string" as any,
          description: "Detailed description",
        },
        priority: { type: "string" as any, enum: ["low", "medium", "high"] },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update status, title, or priority of an existing task by ID",
    parameters: {
      type: "object" as any,
      properties: {
        task_id: { type: "string" as any, description: "UUID of the task" },
        status: {
          type: "string" as any,
          enum: ["pending", "in_progress", "completed", "failed"],
        },
        title: { type: "string" as any },
        priority: { type: "string" as any, enum: ["low", "medium", "high"] },
      },
      required: ["task_id"],
    },
  },
  {
    name: "fetch_tasks",
    description:
      "Fetch the list of tasks, optionally filtered by status or priority",
    parameters: {
      type: "object" as any,
      properties: {
        status: {
          type: "string" as any,
          enum: ["pending", "in_progress", "completed", "failed"],
        },
        priority: { type: "string" as any, enum: ["low", "medium", "high"] },
      },
    },
  },
  {
    name: "get_task_status",
    description: "Get full details of a specific task by ID",
    parameters: {
      type: "object" as any,
      properties: {
        task_id: { type: "string" as any, description: "UUID of the task" },
      },
      required: ["task_id"],
    },
  },
];

const tools: Tool[] = [{ functionDeclarations: toolDeclarations }];

// ─── Tool execution (delegates to TaskRepository) ────────────────────────────

const executeTool = async (
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> => {
  switch (toolName) {
    case "create_task": {
      const id = crypto.randomUUID();
      return await TaskRepository.createTask(
        id,
        userId,
        args.title as string,
        (args.description as string) ?? null,
        (args.priority as string) ?? "medium",
        {},
      );
    }

    case "update_task": {
      const fields: Record<string, unknown> = {};
      if (args.status) fields["status"] = args.status;
      if (args.title) fields["title"] = args.title;
      if (args.priority) fields["priority"] = args.priority;

      const updated = await TaskRepository.updateTask(
        args.task_id as string,
        userId,
        fields as any,
      );
      return updated ?? { error: "Task not found" };
    }

    case "fetch_tasks": {
      return await TaskRepository.findTasksByUser(
        userId,
        { status: args.status as string, priority: args.priority as string },
        20,
        0,
      );
    }

    case "get_task_status": {
      const task = await TaskRepository.findTaskById(
        args.task_id as string,
        userId,
      );
      return task ?? { error: "Task not found" };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};

// ─── Gemini agentic loop ──────────────────────────────────────────────────────

const runAgentLoop = async (
  prompt: string,
  userId: string,
): Promise<{ result: string; toolCalls: ToolCall[] }> => {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_API_MODEL! ,
    tools,
    systemInstruction: `You are AgentFlow, an AI that manages tasks for users.
Use the available tools to create, update, fetch, and check tasks.
Chain multiple tool calls as needed to fully accomplish the user's goal.
Always summarize what you did at the end.`,
  });

  const chat = model.startChat();
  const toolCalls: ToolCall[] = [];

  let response = await chat.sendMessage(prompt);
  let candidate = response.response;

  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const parts = candidate.candidates?.[0]?.content?.parts ?? [];
    const functionCallParts = parts.filter((p: Part) => p.functionCall);

    if (functionCallParts.length === 0) break; // model finished tool calls

    // Execute all tool calls the model requested
    const toolResults: Part[] = [];
    for (const part of functionCallParts) {
      const fc = part.functionCall!;
      console.log(`[Agent] Tool call: ${fc.name}`, fc.args);

      const output = await executeTool(
        fc.name,
        fc.args as Record<string, unknown>,
        userId,
      );

      toolCalls.push({
        tool: fc.name,
        input: fc.args as Record<string, unknown>,
        output,
        timestamp: new Date().toISOString(),
      });

      toolResults.push({
        functionResponse: {
          name: fc.name,
          response: { result: output },
        },
      });
    }

    // Feed results back to the model
    response = await chat.sendMessage(toolResults);
    candidate = response.response;
  }

  const finalText = candidate.text?.() ?? "Agent completed the task.";
  return { result: finalText, toolCalls };
};

// ─── Public service methods ───────────────────────────────────────────────────

export const startRun = async (prompt: string, userId: string) => {
  const runId = crypto.randomUUID();

  // 1. Persist the run as 'running'
  await AgentRepository.createRun(runId, userId, prompt);

  try {
    // 2. Execute the agentic loop
    const { result, toolCalls } = await runAgentLoop(prompt, userId);

    // 3. Mark as completed
    return await AgentRepository.completeRun(runId, result, toolCalls);
  } catch (error) {
    // 4. Mark as failed
    await AgentRepository.failRun(runId, String(error)).catch(() => {});
    throw error;
  }
};

export const getRuns = async (userId: string) => {
  return await AgentRepository.findRunsByUser(userId);
};

export const getRun = async (id: string, userId: string) => {
  const run = await AgentRepository.findRunById(id, userId);
  if (!run) throw new AppError("Agent run not found", 404);
  return run;
};
