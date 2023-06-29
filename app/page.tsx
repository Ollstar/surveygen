"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
// import { fetchEventSource } from "@microsoft/fetch-event-source";
import {
  sampleJson,
  defaultPromptPrefix,
  chatId,
  sectionId,
  researchDomain,
} from "./constants/sample-responses";
import StatementEditor from "./components/StatementEditor";

interface Statement {
  id: string;
  type: string;
  statement: string;
  choices?: string[] | string;
}
interface TransformationCriteria {
  toneValue?: string;
  negativeTone?: string;
  emojiQuantity?: string;
  talkativeRange?: number;
}

const Messages: React.FC = () => {
  const [inflight, setInflight] = useState<boolean>(false);
  const [toneInstructions, setToneInstructions] =
    useState<TransformationCriteria>({});

  const [statements, setStatements] = useState<Statement[]>([]);
  const [updatedStatements, setUpdatedStatements] = useState<Statement[]>([]);
  const [timePerStatement, setTimePerStatement] = useState<number>(0);

  const [inputJson, setInputJson] = useState(sampleJson);
  const [prompt, setPrompt] = useState<string>(defaultPromptPrefix);
  const [toneValue, setToneValue] = useState("Authoritative, cheerful, caring");
  const [negativeTone, setNegativeTone] = useState("sarcastic, irreverent");
  const [emojiQuantity, setEmojiQuantity] = useState(
    "VERY HIGH: 3-5 emojis every 1-2 words"
  );
  const [talkativeRange, setTalkativeRange] = useState(50);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [jsonDrawerOpen, setJsonDrawerOpen] = useState(false);
  const staticPromptPart = `{examples}\n{format_instructions}\n Therefore here are the final Transformed Statements:`;

  useEffect(() => {
    setToneInstructions({
      toneValue: toneValue,
      negativeTone: negativeTone,
      emojiQuantity: emojiQuantity,
      talkativeRange: talkativeRange,
    });
  }, [toneValue, negativeTone, emojiQuantity, talkativeRange]);
  const startTimer = useCallback(() => {
    setCurrentTime(0); // Reset the timer
    setTimePerStatement(0);
    timerInterval.current = setInterval(() => {
      setCurrentTime((prevTime) => prevTime + 10); // Increase by 10 milliseconds
    }, 10); // Update every 10 milliseconds
  }, []);

  const stopTimer = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (inflight) return;
      setInflight(true);

      try {
        startTimer();
        const start = performance.now();

        const response = await fetch(`/api/promptTest`, {
          method: "POST",
          body: JSON.stringify({
            researchQuestions: statements,
            toneInstructions: toneInstructions,
            prompt,
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const responseData = await response.json();
        console.log(responseData);

        const updated = statements.map((statement) => {
          const matchedStatement = responseData.find(
            (res: any) => res.id === statement.id
          );
          if (matchedStatement) {
            return {
              ...statement,
              statement: matchedStatement.transformed_statement,
            };
          }
          return statement;
        });
        stopTimer();

        const end = performance.now();
        const totalTime = end - start; // Calculate the total time
        console.log("Request took", totalTime, "milliseconds.");

        // Calculate time per statement and set it
        setTimePerStatement(totalTime / statements.length / 1000);

        setUpdatedStatements(updated);
      } catch (error) {
        console.error(error);
      } finally {
        setInflight(false);
      }
    },
    [inflight, statements, prompt, toneInstructions]
  );
  // Add this function within your component
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      const jsonDrawer = document.getElementById("jsonDrawer");
      const promptDrawer = document.getElementById("promptDrawer");
      const mainContent = document.getElementById("mainContent");

      // if the click is in the main content area
      if (mainContent && mainContent.contains(event.target as Node)) {
        if (jsonDrawer && jsonDrawerOpen) {
          setJsonDrawerOpen(false);
        }

        if (promptDrawer && drawerOpen) {
          setDrawerOpen(false);
        }
      }
    },
    [jsonDrawerOpen, drawerOpen]
  );

  useEffect(() => {
    // Listen for clicks on the document
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="fixed top-0 left-0 right-0 bg-white z-50 flex justify-between items-center p-3 shadow">
        <div>
          <button
            onClick={() => setJsonDrawerOpen(!jsonDrawerOpen)}
            style={{ width: "260px" }}
            className={`px-4 py-2 text-white rounded ${
              jsonDrawerOpen
                ? "bg-red-500 hover:bg-red-700"
                : "bg-blue-500 hover:bg-blue-700"
            }`}
          >
            {jsonDrawerOpen ? "CLOSE INPUT DRAWER" : "OPEN INPUT DRAWER"}
          </button>
        </div>
        <h1 className="text-2xl font-bold">Prompt Tester</h1>

        <div>
          <button
            style={{ width: "260px" }}
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`px-4 py-2 text-white rounded ${
              drawerOpen
                ? "bg-red-500 hover:bg-red-700"
                : "bg-blue-500 hover:bg-blue-700"
            }`}
          >
            {drawerOpen ? "CLOSE PROMPT DRAWER" : "OPEN PROMPT DRAWER"}
          </button>
        </div>
      </div>

      <div id="mainContent" className="pt-14">
        <div className="flex justify-between items-center">
          <div className="w-1/2 text-right pr-2">
            <p className="text-lg">
              Api time: {new Date(currentTime).toISOString().substr(14, 9)}
            </p>
          </div>
          <div>
            <button
              disabled={inflight}
              onClick={onSubmit}
              className={`px-4 py-2 text-white rounded ${
                inflight
                  ? "bg-red-500 hover:bg-red-700"
                  : "bg-blue-500 hover:bg-blue-700"
              }`}
            >
              SUBMIT
            </button>
          </div>
          <div className="w-1/2 pl-2">
            <p className="text-lg">
              Time per statement: {timePerStatement.toFixed(2)} seconds
            </p>
          </div>
        </div>

        <StatementEditor
          inflight={inflight}
          statements={statements}
          setStatements={setStatements}
          updatedStatements={updatedStatements}
          setUpdatedStatements={setUpdatedStatements}
        />
      </div>

      {/* Drawer for Prompt */}
      <div
        id="promptDrawer"
        className={`fixed top-16 right-0 h-4/5 p-2 transform transition-transform duration-300 ease-in-out bg-white overflow-y-auto shadow-2xl w-1/2 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <h2 className="text-xl font-semibold mb-2 p-4">Prompt:</h2>
        <textarea
          id="prompt"
          style={{
            height: "calc(90% - 8rem)",
            boxSizing: "border-box",
            resize: "none",
          }}
          className="w-full p-4 border rounded overflow-y-scroll"
          defaultValue={prompt}
        />
        <p className="text-gray-500 mt-4 mb-4">{staticPromptPart}</p>

        <button
          className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700`}
          onClick={() => {
            setPrompt(
              (document.getElementById("prompt") as HTMLTextAreaElement).value
            );
            setDrawerOpen(false);
          }}
        >
          OK
        </button>
      </div>

      {/* Drawer for JSON Input */}
      <div
        id="jsonDrawer"
        className={`fixed top-16 left-0 p-2 transform transition-transform duration-300 ease-in-out bg-white overflow-y-auto shadow-2xl w-96 ${
          jsonDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h2 className="text-xl font-semibold mb-2 p-4">JSON Input:</h2>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="toneValue"
          >
            Tone Value
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="toneValue"
            type="text"
            placeholder="Tone Value"
            value={toneValue}
            onChange={(e) => setToneValue(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="negativeTone"
          >
            Negative Tone
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="negativeTone"
            type="text"
            placeholder="Negative Tone"
            value={negativeTone}
            onChange={(e) => setNegativeTone(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="emojiQuantity"
          >
            Emoji Quantity
          </label>
          <select
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="emojiQuantity"
            value={emojiQuantity}
            onChange={(e) => setEmojiQuantity(e.target.value)}
          >
            <option value="">Select an option...</option>
            <option value="ZERO: Zero emojis">ZERO: Zero emojis</option>
            <option value="LOW: 1-2 emojis every 10 words">
              LOW: 1-2 emojis every 10 words
            </option>
            <option value="MEDIUM: 1-2 emojis every 3-5 words">
              MEDIUM: 1-2 emojis every 3-5 words
            </option>
            <option value="HIGH: 3-5 emojis every 3-5 words">
              HIGH: 3-5 emojis every 3-5 words
            </option>
            <option value="VERY HIGH: 3-5 emojis every 1-2 words">
              VERY HIGH: 3-5 emojis every 1-2 words
            </option>
          </select>
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="talkativeRange"
          >
            Talkative Range
          </label>
          <div className="flex items-center">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="talkativeRange"
              type="range"
              min="0"
              max="100"
              value={talkativeRange}
              onChange={(e) => setTalkativeRange(Number(e.target.value))}
            />
            <span className="text-gray-700 ml-2 w-8 text-center">
              {talkativeRange}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-row-reverse">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
            onClick={() => {
              setToneValue(
                (document.getElementById("toneValue") as HTMLInputElement).value
              );
              setNegativeTone(
                (document.getElementById("negativeTone") as HTMLInputElement)
                  .value
              );
              setEmojiQuantity(
                (document.getElementById("emojiQuantity") as HTMLInputElement)
                  .value
              );
              setTalkativeRange(
                Number(
                  (
                    document.getElementById(
                      "talkativeRange"
                    ) as HTMLInputElement
                  ).value
                )
              );
              setJsonDrawerOpen(false);
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
