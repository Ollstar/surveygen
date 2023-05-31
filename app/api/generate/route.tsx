import { ChatOpenAI } from 'langchain/chat_models/openai';
import { LLMChain, SimpleSequentialChain } from 'langchain/chains';
import { CallbackManager } from 'langchain/callbacks';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from 'langchain/prompts';

// Define the PromptTemplates for the playwright and critic scenarios.
const playwrightTemplate = `You are a playwright. Given the {input}, it is your job to write a synopsis for that title.
Title: {input}
Playwright: This is a synopsis for the above play:`;
const criticTemplate = `You are a play critic from the New York Times. Given the synopsis of play, it is your job to write a review for that play.
Play Synopsis:
{synopsis}
Review from a New York Times play critic of the above play:`;
const playwrightPromptTemplate = new PromptTemplate({ template: playwrightTemplate, inputVariables: ["input"] });
const criticPromptTemplate = new PromptTemplate({ template: criticTemplate, inputVariables: ["synopsis"] });

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    // Check if the request is for a streaming response.
    const streaming = req.headers.get('accept') === 'text/event-stream';

    if (streaming) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
  
      let endCounter = 0;
  
      const callbackManager1 = CallbackManager.fromHandlers({
        handleLLMNewToken: async (token: string) => {
          await writer.ready;
          await writer.write(encoder.encode(`data: ${token}\n\n`));
        },
        handleLLMEnd: async () => {
          endCounter++;
          if (endCounter === 2) {
            await writer.ready;
            await writer.close();
          }
        },
        handleLLMError: async (e: Error) => {
          await writer.ready;
          await writer.abort(e);
        },
      });
  
      const callbackManager2 = CallbackManager.fromHandlers({
        handleLLMNewToken: async (token: string) => {
          await writer.ready;
          await writer.write(encoder.encode(`data: ${token}\n\n`));
        },
        handleLLMEnd: async () => {
          endCounter++;
          if (endCounter === 2) {
            await writer.ready;
            await writer.close();
          }
        },
        handleLLMError: async (e: Error) => {
          await writer.ready;
          await writer.abort(e);
        },
      });
  
      const playwrightLLM = new ChatOpenAI({ streaming, callbackManager: callbackManager1 });
      const criticLLM = new ChatOpenAI({ streaming, callbackManager: callbackManager2 });
  
      // Create the LangChain instances for playwright and critic
      const playwrightChain = new LLMChain({ prompt: playwrightPromptTemplate, llm: playwrightLLM });
      const criticChain = new LLMChain({ prompt: criticPromptTemplate, llm: criticLLM });

      // Creating the overall chain
      const overallChain = new SimpleSequentialChain({
        chains: [playwrightChain, criticChain],
        verbose: true,
      });

      // Run the overall chain
      overallChain.call({ input }).catch((e: Error) => console.error(e));
      
      console.log('returning response');
      // Return the readable side of the TransformStream as the HTTP response.
      return new Response(stream.readable, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    } else {
      // For a non-streaming response we can just await the result of the
      // chain.run() call and return it.
      const playwrightLLM = new ChatOpenAI();
      const criticLLM = new ChatOpenAI();

      const playwrightChain = new LLMChain({ prompt: playwrightPromptTemplate, llm: playwrightLLM });
      const criticChain = new LLMChain({ prompt: criticPromptTemplate, llm: criticLLM });

      // Creating the overall chain
      const overallChain = new SimpleSequentialChain({
        chains: [playwrightChain, criticChain],
        verbose: true,
      });

      const response = await overallChain.run(input);

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const runtime = 'edge';
