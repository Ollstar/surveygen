"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
// import { fetchEventSource } from "@microsoft/fetch-event-source";
import { sampleJson, defaultPromptPrefix } from "../constants/sample-responses";

interface Statement {
  id: string;
  type: string;
  statement: string;
  choices?: string[];
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

  const [inputJson, setInputJson] = useState(sampleJson);
  const [prompt, setPrompt] = useState<string>(defaultPromptPrefix);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [jsonDrawerOpen, setJsonDrawerOpen] = useState(false);

  const startTimer = useCallback(() => {
    setCurrentTime(0); // Reset the timer
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
          body: JSON.stringify({ researchQuestions: inputJson, prompt }),
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
        console.log("Request took", end - start, "milliseconds.");

        setUpdatedStatements(updated);
      } catch (error) {
        console.error(error);
      } finally {
        setInflight(false);
      }
    },
    [inflight, inputJson]
  );

  useEffect(() => {
    let parsed;
    try {
      parsed = JSON.parse(inputJson);
      if (parsed.data && parsed.data.statements) {
        setStatements(parsed.data.statements);
        setUpdatedStatements(parsed.data.statements);
      }
      if (parsed.data && parsed.data.transformationCriteria) {
        setToneInstructions(parsed.data.transformationCriteria);
      }
    } catch (e) {
      // invalid JSON, handle error or ignore
    }
    if (parsed) {
      setInputJson(JSON.stringify(parsed, null, 2));
    }
  }, [inputJson]);
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="fixed top-0 left-0 right-0 bg-white z-50 flex justify-between items-center p-4 shadow">
        <div>
          <button
            onClick={() => setJsonDrawerOpen(!jsonDrawerOpen)}
            className={`px-4 py-2 text-white rounded ${
              jsonDrawerOpen ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            {jsonDrawerOpen ? "Close JSON Drawer" : "Open JSON Drawer"}
          </button>
        </div>
        <div className="flex items-center">
          <p className="text-lg">
            Current Time: {new Date(currentTime).toISOString().substr(14, 9)}
          </p>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded ml-4"
          >
            Submit
          </button>
        </div>
        <div>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`px-4 py-2 text-white rounded ${
              drawerOpen ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            {drawerOpen ? "Close Prompt Drawer" : "Open Prompt Drawer"}
          </button>
        </div>
      </div>

      <div className="pt-16">
        <h1 className="text-2xl font-bold mb-4">Prompt Test Page</h1>
        <div className="flex items-center">
        </div>

        <div className="flex">
          <div className="column">
            <h2>Original Statements</h2>
            {statements.map((statement, index) => (
              <div key={index} className="card">
                <div className="font-bold text-xl mb-2">{statement.type}</div>
                <p className="text-gray-700 text-base">{statement.statement}</p>
                <p className="mt-2 text-gray-500">
                  Choices:
                  {statement.choices &&
                    statement.choices.map((choice, choiceIndex) => (
                      <li key={choiceIndex}>{choice}</li>
                    ))}
                </p>
              </div>
            ))}
          </div>
          <div className="column">
            <h2>Updated Statements</h2>
            {updatedStatements.map((statement, index) => (
              <div key={index} className="card">
                <div className="font-bold text-xl mb-2">{statement.type}</div>
                <p className="text-gray-700 text-base">{statement.statement}</p>
                <p className="mt-2 text-gray-500">
                  Choices:
                  {statement.choices &&
                    statement.choices.map((choice, choiceIndex) => (
                      <li key={choiceIndex}>{choice}</li>
                    ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drawer for Prompt */}
      <div
        className={`fixed top-16 right-0 h-4/5 transform transition-transform duration-300 ease-in-out bg-white overflow-y-auto shadow-2xl w-96 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <h2 className="text-xl font-semibold mb-2 p-4">Prompt:</h2>
        <textarea
          id="prompt"
          style={{
            height: "calc(100% - 8rem)",
            boxSizing: "border-box",
            resize: "none",
          }}
          className="w-full p-4 border rounded overflow-y-scroll"
          defaultValue={prompt}
        />
        <button
          style={{ position: "sticky", bottom: 0, left: 0 }}
          className="bg-blue-500 text-white py-2 px-4 rounded"
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
        className={`fixed top-16 left-0 h-4/5 transform transition-transform duration-300 ease-in-out bg-white overflow-y-auto shadow-2xl w-96 ${
          jsonDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h2 className="text-xl font-semibold mb-2 p-4">JSON Input:</h2>
        <div>
            <h2>Tone Instructions:</h2>
            <p>Tone Value: {toneInstructions.toneValue}</p>
            <p>Negative Tone: {toneInstructions.negativeTone}</p>
            <p>Emoji Quantity: {toneInstructions.emojiQuantity}</p>
            <p>Talkative Range: {toneInstructions.talkativeRange}</p>
          </div>
        <textarea
          id="json"
          style={{
            height: "calc(65% - 5rem)",
            boxSizing: "border-box",
            resize: "none",
          }}
          className="w-full p-4 border rounded overflow-y-scroll"
          defaultValue={inputJson}
        />
        
        <button
          style={{ bottom: 0, right: 0 }}
          className="bg-blue-500 text-white py-2 px-4 rounded"
          onClick={() => {
            setInputJson(
              (document.getElementById("json") as HTMLTextAreaElement).value
            );
            setJsonDrawerOpen(false);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default Messages;
