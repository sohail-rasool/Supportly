import { Agent } from "@openai/agents";
import type { SupportContext } from "../context";
import {
  createInputGuardrail,
  createOutputGuardrail,
} from "../guardrails";
import { withHandoffInstructions } from "../prompts";
import { billingTools } from "../tools/billing-tools";
import { escalationTools } from "../tools/escalation-tools";

import { aiModel as model, aiModelSettings } from "../model-provider";

export const billingAgent = new Agent<SupportContext>({
  name: "Billing Agent",
  handoffDescription:
    "Handles invoices, payments, refunds, and billing disputes.",
  instructions: withHandoffInstructions(`You are the Billing Agent for Supportly.
Help customers with invoices, payments, and refunds.
Use your tools to look up real invoice data before answering.
Keep replies concise and friendly.
Never invent invoice IDs or payment details.

If the user asks to speak with a human, agent, or representative:
1. Call create_human_escalation_ticket
2. Confirm the ticket was created
3. Tell them a human will follow up
4. Do not try to solve the issue further after escalating`),
  model,
  modelSettings: aiModelSettings,
  tools: [...billingTools, ...escalationTools],
  inputGuardrails: [createInputGuardrail("Billing Agent")],
  outputGuardrails: [createOutputGuardrail("Billing Agent")],
});
