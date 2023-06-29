import { ChangeEvent, useEffect } from "react";
import {
  defaultStatements,
  chatElementTypes,
} from "../constants/sample-responses";
import { XCircleIcon } from "@heroicons/react/24/solid";

interface Statement {
  id: string;
  type: string;
  statement: string;
  choices?: string[] | string; // Update type annotation here
}

interface StatementEditorProps {
  inflight: boolean;
  statements: Statement[];
  setStatements: React.Dispatch<React.SetStateAction<Statement[]>>;
  updatedStatements: Statement[];
  setUpdatedStatements: React.Dispatch<React.SetStateAction<Statement[]>>;
}

const StatementEditor: React.FC<StatementEditorProps> = ({
  inflight,
  statements,
  setStatements,
  updatedStatements,
  setUpdatedStatements,
}) => {
  useEffect(() => {
    setStatements(defaultStatements.statements);
  }, []);

  const handleStatementChange = (
    index: number,
    field: keyof Statement,
    value: string
  ) => {
    const updatedStatements = [...statements];
    updatedStatements[index][field] = value;
    setStatements(updatedStatements);
    setUpdatedStatements([]); // Reset updatedStatements to empty array
  };

  const addStatement = () => {
    const newStatement: Statement = {
      id: Date.now().toString(),
      type: "",
      statement: "",
      choices: [],
    };
    setStatements([newStatement, ...statements]);
    setUpdatedStatements([]); // Reset updatedStatements to empty array
  };

  const removeStatement = (index: number) => {
    const updatedStatements = [...statements];
    updatedStatements.splice(index, 1);
    setStatements(updatedStatements);
    setUpdatedStatements([]); // Reset updatedStatements to empty array
  };

  const addChoice = (statementIndex: number) => {
    const updatedStatements = [...statements];
    const choices = updatedStatements[statementIndex].choices;

    if (Array.isArray(choices)) {
      choices.push("");
    } else {
      updatedStatements[statementIndex].choices = choices
        ? [choices, ""]
        : [""];
    }

    setStatements(updatedStatements);
    setUpdatedStatements([]); // Reset updatedStatements to empty array
  };

  const removeChoice = (statementIndex: number, choiceIndex: number) => {
    const updatedStatements = [...statements];
    const choices = updatedStatements[statementIndex].choices;

    if (Array.isArray(choices)) {
      choices.splice(choiceIndex, 1);
      setStatements(updatedStatements);
      setUpdatedStatements([]); // Reset updatedStatements to empty array
    }
  };

  const handleChoiceChange = (
    statementIndex: number,
    choiceIndex: number,
    value: string
  ) => {
    const updatedStatements = [...statements];
    const choices = updatedStatements[statementIndex].choices;

    if (Array.isArray(choices)) {
      choices[choiceIndex] = value;
    }

    setStatements(updatedStatements);
    setUpdatedStatements([]); // Reset updatedStatements to empty array
  };

  return (
    <div>
      <div className="items-center">
        <button
          onClick={addStatement}
          className="ml-6 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-md"
        >
          ADD STATEMENT
        </button>
      </div>
      {statements.map((statement, index) => (
        <div key={index} className="grid grid-cols-2 items-start">
          <div className="card flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <select
                value={statement.type}
                onChange={(e) =>
                  handleStatementChange(index, "type", e.target.value)
                }
                className="text-gray-700 p-2 rounded border-none bg-gray-200 focus:border-blue-300 w-1/2"
              >
                {chatElementTypes.map((option, optionIndex) => (
                  <option key={optionIndex} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              
            </div>
            <div className="w-full">
              <textarea
                rows={5}
                style={{ resize: "none" }}
                value={statement.statement}
                readOnly={inflight}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  handleStatementChange(index, "statement", e.target.value)
                }
                className="text-gray-700 p-2 w-full rounded border-none bg-gray-200  focus:border-blue-300 flex-grow"
              />
            </div>
            {["MultipleChoiceCard", "SingleChoiceCard"].includes(
              statement.type
            ) && (
              <div className="flex flex-col mt-2">
                <div className="flex items-center mb-2">
                  <p className="text-gray-500">Choices:</p>
                  <button
                    onClick={() => addChoice(index)}
                    className="ml-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-md"
                  >
                    ADD CHOICE
                  </button>
                </div>
                {Array.isArray(statement.choices) ? (
                  statement.choices.map((choice, choiceIndex) => (
                    <div key={choiceIndex} className="flex items-center mb-2">
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) =>
                          handleChoiceChange(index, choiceIndex, e.target.value)
                        }
                        className="text-gray-700 p-2 rounded border-none bg-gray-200 focus:border-blue-300 flex-grow"
                      />
                      <button
                        onClick={() => removeChoice(index, choiceIndex)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <XCircleIcon className="h-8 w-8" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <li>{statement.choices}</li>
                )}
              </div>
              
            )}
    <div className="flex justify-end">
    <button
      onClick={() => removeStatement(index)}
      className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-md w-30"
    >
      REMOVE STATEMENT
    </button>
  </div>    
          </div>
          {updatedStatements && updatedStatements[index] && (
            <div className="card mt-4" style={{ alignSelf: "start" }}>
              <div className="font-bold text-xl mb-2">
                {updatedStatements[index].type}
              </div>
              <p
                className={`text-gray-700 text-base p-2 rounded ${
                  updatedStatements[index].statement !== statement.statement
                    ? "bg-purple-100"
                    : ""
                }`}
              >
                {updatedStatements[index].statement}
              </p>
              {updatedStatements[index].choices && (
                <p className="mt-2 text-gray-500">
                  {(() => {
                    const choices: string[] | string =
                      updatedStatements[index].choices ?? "";
                    return Array.isArray(choices) ? (
                      choices.map((choice, choiceIndex) => (
                        <li key={choiceIndex}>{choice}</li>
                      ))
                    ) : (
                      <li>{choices}</li>
                    );
                  })()}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatementEditor;
