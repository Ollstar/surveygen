import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain, SequentialChain } from "langchain/chains";
import { CallbackManager } from "langchain/callbacks";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from "langchain/prompts";

const businessGoalTemplate = `You are a business strategist. Given the {input}, it is your job to establish a business goal in less than 50 words.
Input: {input}
Business Goal:`;

const targetAudienceTemplate = `You are a marketing analyst. Given the business goal and original input, it's your job to define a target audience in less than 20 words.
Business Goal: {businessGoal}
Target Audience:`;

const surveyTypeTemplate = `You are a survey specialist. Given the input, business goal, and target audience, it's your job to determine the type of survey to conduct in less than 20 words.
Target Audience: {targetAudience}
Survey Type:`;

const surveyTitleTemplate = `You are a content creator. Given the input, business goal, target audience, and survey type, it's your job to come up with a title for the survey.
Survey Type: {surveyType}
Survey Title:`;

const businessGoalPromptTemplate = new PromptTemplate({
  template: businessGoalTemplate,
  inputVariables: ["input"],
});

const targetAudiencePromptTemplate = new PromptTemplate({
  template: targetAudienceTemplate,
  inputVariables: ["businessGoal"],
});

const surveyTypePromptTemplate = new PromptTemplate({
  template: surveyTypeTemplate,
  inputVariables: ["targetAudience"],
});

const surveyTitlePromptTemplate = new PromptTemplate({
  template: surveyTitleTemplate,
  inputVariables: ["surveyType"],
});

export async function POST(req: Request) {
  try {
    const { input } = await req.json();
    const streaming = req.headers.get("accept") === "text/event-stream";

    if (streaming) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      let endCounter = 0;

      // Generate CallbackManager for each stream
      const callbackManagers = Array(4)
        .fill(null)
        .map((_, i) => {
          return CallbackManager.fromHandlers({
            handleLLMNewToken: async (token: string) => {
              await writer.ready;
              await writer.write(encoder.encode(`data: ${token}\n\n`));
            },
            handleLLMEnd: async () => {
              endCounter++;
              await writer.ready;
              await writer.write(
                encoder.encode(
                  `event: stream${i + 1}Ended\ndata: stream${i + 1}Ended\n\n`
                )
              );
              if (endCounter === 4) {
                await writer.close();
              }
            },
            handleLLMError: async (e: Error) => {
              await writer.ready;
              await writer.abort(e);
            },
          });
        });

      // Create LLMChain for each step
      const chains = [
        businessGoalPromptTemplate,
        targetAudiencePromptTemplate,
        surveyTypePromptTemplate,
        surveyTitlePromptTemplate,
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
        ][i]; // Add this line
        return new LLMChain({ llm, prompt: prompt, outputKey: outputKey }); // Add outputKey here
      });

      const overallChain = new SequentialChain({
        chains: chains,
        inputVariables: ["input"],  // Add this line
        outputVariables: ["surveyTitle"],  // Add this line
        verbose: true,
      });

      // Run the overall chain
      overallChain.call({ input }).catch((e: Error) => console.error(e));

      console.log("returning response");
      return new Response(stream.readable, {
        headers: { "Content-Type": "text/event-stream" },
      });
    } else {
      // For a non-streaming response we can just await the result of the
      // overallChain.run() call and return it.
      const businessGoalLLM = new ChatOpenAI();
      const targetAudienceLLM = new ChatOpenAI();
      const surveyTypeLLM = new ChatOpenAI();
      const surveyTitleLLM = new ChatOpenAI();

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

      // Creating the overall chain
      // Creating the overall chain
      const overallChain = new SequentialChain({
        chains: [
          businessGoalChain,
          targetAudienceChain,
          surveyTypeChain,
          surveyTitleChain,
        ],
        inputVariables: ["input"], // Add this line
        verbose: true,
      });

      const response = await overallChain.run(input);

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
