import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  FewShotPromptTemplate,
  LengthBasedExampleSelector,
  PromptTemplate,
  SemanticSimilarityExampleSelector,
} from "langchain/prompts";
import { z } from "zod";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {
  StructuredOutputParser,
  OutputFixingParser,
} from "langchain/output_parsers";

import {
  EMOJI_EXAMPLES,
  RESPONSE_EXAMPLES,
} from "@/app/constants/sample-responses";
import { CallbackManager } from "langchain/callbacks";

const promptResponseSchema = z.array(
  z.object({
    id: z.string().describe("Statement ID"),
    transformed_statement: z
      .string()
      .describe(
        "The transformed statement after the market researcher has rewritten it"
      ),
  })
);

const parser = StructuredOutputParser.fromZodSchema(promptResponseSchema);
const fixParser = OutputFixingParser.fromLLM(
  new ChatOpenAI({ temperature: 0 }),
  parser
);
const formatInstructions = fixParser.getFormatInstructions();

export async function POST(req: Request) {
  const requestBody = await req.json();
  const researchQuestions = JSON.parse(requestBody.researchQuestions);
    const prompt = requestBody.prompt;

  const examplePrompt = new PromptTemplate({
    inputVariables: ["statements", "emojiQuantity", "talkativeRange", "output"],
    template:
      "Original Statement:{statements}\nEmoji quantity:{emojiQuantity}\nTalkative range:{talkativeRange}\n\nTransformed statement: {output}",
  });
  const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
    RESPONSE_EXAMPLES,
    new OpenAIEmbeddings(),
    MemoryVectorStore,
    { k: 5 }
  );

  const examples = await exampleSelector.selectExamples({
    emojiQuantity: researchQuestions.data.transformationCriteria.emojiQuantity,
  });
  const dynamicPrompt = new FewShotPromptTemplate({
    examples,
    examplePrompt,
    prefix:
      prompt,
    suffix:
      "{format_instructions}\n Therefore here are the final Transformed Statements:",
    inputVariables: [
      "statements",
      "toneValue",
      "negativeTone",
      "emojiQuantity",
      "talkativeRange",
    ],
    partialVariables: { format_instructions: formatInstructions },
  });

  try {
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const callbackManager = CallbackManager.fromHandlers({
      handleLLMNewToken: async (token: string) => {
        await writer.ready;
        await writer.write(encoder.encode(`data: ${token}\n\n`));
      },
      handleLLMEnd: async () => {
        await writer.ready;
        writer.abort;
        console.log("end");
      },
      handleLLMError: async (e: Error) => {
        await writer.ready;
        await writer.abort(e);
      },
    });
    const llm = new OpenAI({
      streaming: false,
      callbackManager: callbackManager,
      modelName: "gpt-3.5-turbo-16k-0613",
      temperature: 0.9,
      maxTokens: 8000,
      cache: false,
    });

    // to reduce tokens, we will use the index as the id
    const orignalIds = researchQuestions.data.statements.map(
      (statement: any) => statement.id
    );
    researchQuestions.data.statements.forEach(
      (statement: any, index: number) => {
        statement.id = index.toString();
      }
    );

    const { toneValue, negativeTone, emojiQuantity, talkativeRange } =
      researchQuestions.data.transformationCriteria;

    const prompt = await dynamicPrompt.format({
      statements: JSON.stringify(researchQuestions.data.statements),
      toneValue: toneValue,
      negativeTone: negativeTone,
      emojiQuantity: emojiQuantity,
      talkativeRange: talkativeRange,
    });

    console.log("prompt", prompt);
    let msg = await llm.call(prompt);
    const response = await fixParser.parse(msg);
    // put the original ids back
    response.forEach((statement, index) => {
      statement.id = orignalIds[index];
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const runtime = "edge";
