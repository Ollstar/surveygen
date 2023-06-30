"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
// import { fetchEventSource } from "@microsoft/fetch-event-source";
import { defaultPromptPrefix } from "./constants/sample-responses";
import StatementEditor from "./components/StatementEditor";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import { Tooltip } from "@mui/material";
import { InformationCircleIcon } from "@heroicons/react/24/solid";

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
  talkativeRange?: string;
}

const Messages: React.FC = () => {
  const [inflight, setInflight] = useState<boolean>(false);
  const [toneInstructions, setToneInstructions] =
    useState<TransformationCriteria>({});

  const [statements, setStatements] = useState<Statement[]>([]);
  const [updatedStatements, setUpdatedStatements] = useState<Statement[]>([]);
  const [timePerStatement, setTimePerStatement] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>(defaultPromptPrefix);
  const [toneValue, setToneValue] = useState("Authoritative, cheerful, caring");
  const [negativeTone, setNegativeTone] = useState("sarcastic, irreverent");
  const [emojiQuantity, setEmojiQuantity] = useState(
    "VERY HIGH: 3-5 emojis every 1-2 words"
  );
  const [talkativeRange, setTalkativeRange] = useState(
    "SAME WORDY: Same amount of content as original"
  );

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
        const totalTime = (end - start) / 1000;
        setTimePerStatement(totalTime / statements.length);
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
        <h1 className="text-2xl font-bold">Prompt Tester</h1>
        <div className="flex">
          <button
            onClick={() => setJsonDrawerOpen(!jsonDrawerOpen)}
            className={`px-4 py-2 text-blue-500 hover:text-blue-700 hover:bg-gray-100 rounded mr-2`}
          >
            PROMPT SETTINGS
          </button>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`px-4 py-2 text-blue-500 hover:text-blue-700 hover:bg-gray-100 rounded mr-2`}
          >
            PROMPT SCRIPT
          </button>
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
      </div>

      <div id="mainContent" className="pt-14">
        <div className="flex flex-col items-end">
          <div className="flex items-center mb-2 mr-8">
            <p>Api time (seconds):</p>
            <p className="text-lg w-20">{(currentTime / 1000).toFixed(2)}</p>
          </div>
          <div className="flex items-center mb-2 mr-8">
            <p>Time per statement (seconds):</p>
            <p className="text-lg w-20">
              {isNaN(currentTime / statements.length / 1000)
                ? "0.00"
                : (currentTime / statements.length / 1000).toFixed(2)}
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
        className={`fixed top-16 rounded right-0 h-full p-2 transform transition-transform duration-300 ease-in-out bg-gray-100 overflow-y-auto shadow-2xl w-1/2 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Prompt:</h2>
          <Tooltip
            title={
              <p className="text-sm">
                Use the input variables in your prompt by enclosing them in{" "}
                {`{ }`} for example: {`{toneValue}`}.{" "}
                {`\n\nThere are 4 inputs: statements, toneValue, emojiQuantity, and talkativeRange.`}
              </p>
            }
            arrow
            placement="left"
          >
            <InformationCircleIcon className="h-10 w-10 text-gray-500" />
          </Tooltip>
        </div>
        <p> Prefix: </p>

        <textarea
          id="prompt"
          style={{
            height: "calc(90% - 12rem)",
            boxSizing: "border-box",
            resize: "none",
          }}
          className="w-full p-4 border-none rounded overflow-y-scroll"
          defaultValue={prompt}
        />
        <p> Suffix: </p>
        <p className="text-gray-500 mb-4">{staticPromptPart}</p>

        <button
          className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700`}
          onClick={() => {
            setPrompt(
              (document.getElementById("prompt") as HTMLTextAreaElement).value
            );
            setDrawerOpen(false);
          }}
        >
          SUBMIT
        </button>
      </div>

      <Dialog
        open={jsonDrawerOpen}
        onClose={() => setJsonDrawerOpen(false)}
        aria-labelledby="form-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="form-dialog-title">Prompt settings:</DialogTitle>
        <DialogContent>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-md font-bold mb-2"
              htmlFor="toneValue"
            >
              Tone descriptors
            </label>
            <input
              className="shadow appearance-none border-none rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="toneValue"
              type="text"
              placeholder="Tone Value"
              value={toneValue}
              onChange={(e) => setToneValue(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-md font-bold mb-2"
              htmlFor="emojiQuantity"
            >
              Emoji quantity
            </label>
            <select
              className="shadow border-none rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
              className="block text-gray-700 text-md font-bold mb-2"
              htmlFor="talkativeScore"
            >
              Talkative score
            </label>
            <select
              className="shadow border-none rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="talkativeScore"
              value={talkativeRange}
              onChange={(e) => setTalkativeRange(e.target.value)}
            >
              <option value="">Select an option...</option>
              <option value="ZERO: No additional words">
                ULTRA LESS WORDY: Remove any extra content not a part of
                original
              </option>
              <option value="LOW: A few additional words">
                MUCH LESS WORDY: Much less content than original
              </option>
              <option value="LIGHTLY WORDY: Some additional words and phrases">
                LESS WORDY: Less content than original
              </option>
              <option value="SAME WORDY: Same amount of content as original">
                SAME WORDY: Same amount of content as original
              </option>
              <option value="WORDY: More additional content than original">
                WORDY: More additional content than original
              </option>
              <option value="VERY WORDY: Significantly more additional content">
                VERY WORDY: Significantly more additional content
              </option>
              <option value="ULTRA WORDY: Maximum additional content">
                ULTRA WORDY: Maximum additional content
              </option>
            </select>
          </div>
        </DialogContent>
        <DialogActions>
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
            onClick={() => {
              setJsonDrawerOpen(false);
            }}
          >
            CLOSE
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Messages;
