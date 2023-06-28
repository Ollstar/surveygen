"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const PromptTest: React.FC = () => {
  const [inflight, setInflight] = useState<boolean>(false);
  const [toneValue, setToneValue] = useState<string>(
    "authoritative, caring, cheerful"
  );
  const [negativeTone, setNegativeTone] = useState<string>(
    "sarcastic, irreverent"
  );
  const [emojiQuantity, setEmojiQuantity] = useState<string>(
    "3-5 emojis every 5-10 words"
  );
  const [talkativeRange, setTalkativeRange] = useState<number>(50);
  const [statements, setStatements] = useState([
    {
      id: "1",
      type: "MultipleChoiceCard",
      choices: "running fast, getting places",
      statement: "What do you like about running?",
    },
  ]);
  let chatElementTypes = [
    { label: "Section", value: "Section" },
    { label: "Jump Ahead Card", value: "JumpAheadCard" },
    { label: "Open Ended Image Card", value: "OpenEndedImageCard" },
    { label: "Open Ended Video Card", value: "OpenEndedVideoCard" },
    { label: "Open Ended Text Card", value: "OpenEndedTextCard" },
    { label: "Open Ended Number Card", value: "OpenEndedNumberCard" },
    { label: "Multiple Choice Card", value: "MultipleChoiceCard" },
    { label: "Participation Marker Card", value: "ParticipationMarkerCard" },
    { label: "Recontact Card", value: "RecontactCard" },
    { label: "Recontact Card V2", value: "RecontactCardV2" },
    { label: "Redirect Card", value: "RedirectCard" },
    { label: "Text Message Card", value: "TextMessageCard" },
    { label: "Image Message Card", value: "ImageMessageCard" },
    { label: "Video Message Card", value: "VideoMessageCard" },
    { label: "Single Choice Card", value: "SingleChoiceCard" },
  ];

  const handleAddStatement = () => {
    setStatements([
      ...statements,
      { id: "", type: "", choices: "", statement: "" },
    ]);
  };

  const handleRemoveStatement = (index: number) => {
    const newStatements = [...statements];
    newStatements.splice(index, 1);
    setStatements(newStatements);
  };
  const handleStatementChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const newStatements = [...statements];
    const { name, value } = event.target;
    newStatements[index][name as keyof (typeof newStatements)[0]] = value;
    setStatements(newStatements);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const value = e.target.value;
    switch (e.target.name) {
      case "toneValue":
        setToneValue(value);
        break;
      case "negativeTone":
        setNegativeTone(value);
        break;
      case "emojiQuantity":
        setEmojiQuantity(value);
        break;
      case "talkativeRange":
        setTalkativeRange(parseInt(value));
        break;
      default:
        break;
    }
  };
  const input = {
    transformationCriteria: {
      toneValue: toneValue,
      negativeTone: negativeTone,
      emojiQuantity: emojiQuantity,
      talkativeRange: talkativeRange,
    },
    statements: statements,
  };

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (inflight) return;
      setInflight(true);

      try {
        let isFirstChunk = true;
        let researchQuestions = input;
        console.log("0", researchQuestions);
        await fetchEventSource(`/api/promptTest`, {
          method: "POST",
          body: JSON.stringify({ researchQuestions }),
          headers: { "Content-Type": "application/json" },
          onmessage(ev) {
            const newChunk = ev.data;
            console.log(newChunk);
          },
        });
      } catch (error) {
        console.error(error);
      } finally {
        setInflight(false);
      }
    },
    [input, inflight]
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Prompt Test Page</h1>
      <form onSubmit={onSubmit} className="mb-6">
        <label htmlFor="toneValue" className="block mb-2">
          Desired Tone Value
        </label>
        <input
          id="toneValue"
          name="toneValue"
          className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
          value={toneValue}
          onChange={handleInputChange}
          placeholder="Desired tone value"
        />

        <label htmlFor="negativeTone" className="block mb-2">
          Negative Tone Value
        </label>
        <input
          id="negativeTone"
          name="negativeTone"
          className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
          value={negativeTone}
          onChange={handleInputChange}
          placeholder="Negative tone value"
        />

        <label htmlFor="emojiQuantity" className="block mb-2">
          Quantity of Emojis
        </label>
        <input
          id="emojiQuantity"
          name="emojiQuantity"
          className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
          value={emojiQuantity}
          onChange={handleInputChange}
          placeholder="Quantity of emojis"
        />

        <label htmlFor="talkativeRange" className="block mb-2">
          Talkative Range (1-100)
        </label>
        <input
          id="talkativeRange"
          type="number"
          name="talkativeRange"
          className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
          value={talkativeRange}
          onChange={handleInputChange}
          placeholder="Talkative range (1-100)"
        />

        {statements.map((statement, index) => (
          <div key={index} className="mb-4">
            <label className="block mb-2">Statement {index + 1}</label>
            <input
              name="id"
              value={statement.id}
              onChange={(event) => handleStatementChange(index, event)}
              className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
              placeholder="ID"
            />
            <select
              name="type"
              value={statement.type}
              onChange={(event) => handleStatementChange(index, event)}
              className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
            >
              {chatElementTypes.map((type, index) => (
                <option key={index} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              name="choices"
              value={statement.choices}
              onChange={(event) => handleStatementChange(index, event)}
              className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
              placeholder="Choices (separate with commas)"
            />
            <input
              name="statement"
              value={statement.statement}
              onChange={(event) => handleStatementChange(index, event)}
              className="w-full h-10 p-2 border border-gray-300 rounded-md mb-4"
              placeholder="Statement"
            />
            <button
              type="button"
              onClick={() => handleRemoveStatement(index)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 mb-4"
            >
              Remove Statement
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddStatement}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 mb-4"
        >
          Add Statement
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default PromptTest;
