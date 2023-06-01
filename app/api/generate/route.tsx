import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain, SequentialChain } from "langchain/chains";
import { CallbackManager } from "langchain/callbacks";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from "langchain/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const surveyAnswersSchema = z.object({
  question: z.string().describe("Question"),
  answers: z.array(z.string()).describe("Answers"),
});
const businessGoalTemplate = `You are a business strategist. Given the {businessTopic}, it is your job to establish a business goal in less than 50 words.
Business Topic: {businessTopic}
Business Goal:`;

const targetAudienceTemplate = `You are a marketing analyst. Given the {businessGoal} and original {businessTopic}, it's your job to define a target audience in less than 20 words.
Business Topic: {businessTopic}
Business Goal: {businessGoal}
Target Audience:`;

const surveyTypeTemplate = `You are a survey specialist. Given the input, business goal, and target audience, it's your job to determine the type of survey to conduct in less than 20 words.
Target Audience: {targetAudience}
Survey Type:`;

const surveyTitleTemplate = `You are a content creator. Given the input, business goal, target audience, and survey type, it's your job to come up with a title for the survey.
Survey Type: {surveyType}
Survey Title:`;

const surveyQuestionTemplate = `You are a survey designer. Given the survey title, come up with the first question of the survey.
Survey Title: {surveyTitle}
Survey Question:`;

const surveyAnswersTemplate = `You are a survey designer. Generate 4-6 possible answers for the survey question.\n{format_instructions}
Survey Question: {surveyQuestion}
Survey Answers:`;

const businessGoalPromptTemplate = new PromptTemplate({
  template: businessGoalTemplate,
  inputVariables: ["businessTopic"],
});

const targetAudiencePromptTemplate = new PromptTemplate({
  template: targetAudienceTemplate,
  inputVariables: ["businessGoal"],
  partialVariables: { businessTopic: "businessTopic" },
});

const surveyTypePromptTemplate = new PromptTemplate({
  template: surveyTypeTemplate,
  inputVariables: ["targetAudience"],
});

const surveyTitlePromptTemplate = new PromptTemplate({
  template: surveyTitleTemplate,
  inputVariables: ["surveyType"],
});

const surveyQuestionPromptTemplate = new PromptTemplate({
  template: surveyQuestionTemplate,
  inputVariables: ["surveyTitle"],
});

const parser = StructuredOutputParser.fromZodSchema(surveyAnswersSchema);

const formatInstructions = parser.getFormatInstructions();

const surveyAnswersPromptTemplate = new PromptTemplate({
  template: surveyAnswersTemplate,
  inputVariables: ["surveyQuestion"],
  partialVariables: { format_instructions: formatInstructions },
});

export async function POST(req: Request) {
  try {
    const { businessTopic } = await req.json();
    const streaming = req.headers.get("accept") === "text/event-stream";

    if (streaming) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      let endCounter = 0;

      const callbackManagers = Array(6)
        .fill(null)
        .map((_, i) => {
          return CallbackManager.fromHandlers({
            handleLLMNewToken: async (token: string) => {
              await writer.ready;
              if (endCounter < 5) {
                await writer.write(encoder.encode(`data: ${token}\n\n`));
              }
            },
            handleLLMEnd: async () => {
              endCounter++;
              await writer.ready;
              await writer.write(
                encoder.encode(
                  `event: stream${i + 1}Ended\ndata: stream${i + 1}Ended\n\n`
                )
              );
            },
            handleLLMError: async (e: Error) => {
              await writer.ready;
              await writer.abort(e);
            },
          });
        });

      const chains = [
        businessGoalPromptTemplate,
        targetAudiencePromptTemplate,
        surveyTypePromptTemplate,
        surveyTitlePromptTemplate,
        surveyQuestionPromptTemplate,
        surveyAnswersPromptTemplate,
      ].map((prompt, i) => {
        const llm = new ChatOpenAI({
          streaming,
          callbackManager: callbackManagers[i],
        });

        const outputKey = [
          "businessGoal",
          "targetAudience",
          "surveyType",
          "surveyTitle",
          "surveyQuestion",
          "surveyAnswers",
        ][i];
        let outputParser;
        if (outputKey === "surveyAnswers") {
          outputParser = parser; // Add parser only to the surveyAnswers chain
        }
        return new LLMChain({
          llm,
          prompt: prompt,
          outputKey: outputKey,
          outputParser,
        });
      });
      const overallChain = new SequentialChain({
        chains: chains,
        inputVariables: ["businessTopic"],
        outputVariables: ["surveyAnswers"],
        verbose: true,
      });

      overallChain
        .call({ businessTopic })
        .then(async (response) => {
          await writer.ready;
          const aiOutput = response;
          console.log(aiOutput);

          const msg = JSON.stringify(response);
          await writer.write(
            encoder.encode(`event: overallChainParsed\ndata: ${msg}\n\n`)
          );
          await writer.close();
        })
        .catch((e: Error) => console.error(e));

      console.log("returning response");

      return new Response(stream.readable, {
        headers: { "Content-Type": "text/event-stream" },
      });
    } else {
      const businessGoalLLM = new ChatOpenAI();
      const targetAudienceLLM = new ChatOpenAI();
      const surveyTypeLLM = new ChatOpenAI();
      const surveyTitleLLM = new ChatOpenAI();
      const surveyQuestionLLM = new ChatOpenAI();
      const surveyAnswersLLM = new ChatOpenAI();

      const businessGoalChain = new LLMChain({
        prompt: businessGoalPromptTemplate,
        llm: businessGoalLLM,
      });

      const targetAudienceChain = new LLMChain({
        prompt: targetAudiencePromptTemplate,
        llm: targetAudienceLLM,
      });

      const surveyTypeChain = new LLMChain({
        prompt: surveyTypePromptTemplate,
        llm: surveyTypeLLM,
      });

      const surveyTitleChain = new LLMChain({
        prompt: surveyTitlePromptTemplate,
        llm: surveyTitleLLM,
      });

      const surveyQuestionChain = new LLMChain({
        prompt: surveyQuestionPromptTemplate,
        llm: surveyQuestionLLM,
      });

      const surveyAnswersChain = new LLMChain({
        prompt: surveyAnswersPromptTemplate,
        llm: surveyAnswersLLM,
      });

      const overallChain = new SequentialChain({
        chains: [
          businessGoalChain,
          targetAudienceChain,
          surveyTypeChain,
          surveyTitleChain,
          surveyQuestionChain,
          surveyAnswersChain,
        ],
        inputVariables: ["businessTopic"],
        verbose: true,
      });

      const response = await overallChain.run(businessTopic);

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const runtime = "edge";
