"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

interface Message {
  id: string;
  sender: "user" | "bot";
  content: string;
}

const Chat: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now().toString(),
      sender: "bot",
      content: "Describe your business.",
    },
  ]);
  const [inflight, setInflight] = useState<boolean>(false);
  const botMessageRef = useRef<Message | null>(null);
  const [stream, setStream] = useState<boolean>(true);
  const streamEndMessages = [
    "That's a goal anyone can be proud of. Let's choose a target audience. 🎯",
    "Excellent. Here's a survey topic! 📝",
    "Awesome! How about a survey title? 📃",
    "Perfect, let's keep going. How about a survey question. 🤔",
    "Now some survey answers for that question! 💡",
    "Fantastic! We've polished our survey answers. 💎",
  ];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSurveyAnswer = (answer: string) => {
    setInput(answer);
  };

  const parseAnswers = (answersString: string): string[] => {
    try {
      const answers = JSON.parse(answersString);
      if (Array.isArray(answers)) {
        return answers;
      }
    } catch (error) {
      console.error("Invalid JSON in answers:", error);
    }
    return [answersString]; // Return the original string if parsing fails
  };

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (inflight) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        sender: "user",
        content: input,
      };
      setMessages((prev) => [...prev, userMessage]);
      const startStreamMessage: Message = {
        id: Date.now().toString(),
        sender: "bot",
        content: `Coming up with a business goal 🤓.`,
      };
      setMessages((prevMessages) => [...prevMessages, startStreamMessage]);
      setInflight(true);

      try {
        if (stream) {
          let isFirstChunk = true;
          let businessTopic = input;
          let streamIndex = 1;
          await fetchEventSource(`/api/generate`, {
            method: "POST",
            body: JSON.stringify({ businessTopic }),
            headers: { "Content-Type": "application/json" },
            onmessage(ev) {
              const newChunk = ev.data;
              if (newChunk.startsWith("stream") && newChunk.endsWith("Ended")) {
                const endStreamMessage: Message = {
                  id: Date.now().toString(),
                  sender: "bot",
                  content:
                    streamEndMessages[streamIndex - 1] ||
                    `Stream ${streamIndex} ended.`,
                };
                setMessages((prevMessages) => [
                  ...prevMessages,
                  endStreamMessage,
                ]);
                botMessageRef.current = null;
                isFirstChunk = true;
                streamIndex++;
              } else {
                if (isFirstChunk) {
                  const botMessage: Message = {
                    id: Date.now().toString(),
                    sender: "bot",
                    content: newChunk,
                  };
                  botMessageRef.current = botMessage;
                  setMessages((prevMessages) => [...prevMessages, botMessage]);
                  isFirstChunk = false;
                } else {
                  if (botMessageRef.current) {
                    botMessageRef.current.content += newChunk;
                    setMessages((prevMessages) => {
                      const updatedMessages = prevMessages.map((message) => {
                        if (
                          botMessageRef.current &&
                          message.id === botMessageRef.current.id
                        ) {
                          return {
                            ...message,
                            content: botMessageRef.current.content,
                          };
                        }
                        return message;
                      });
                      return updatedMessages;
                    });
                  }
                }
              }
            },
          });
          setInput("");
        } else {
          let businessTopic = input;
          const res = await fetch(`/api/generate`, {
            method: "POST",
            body: JSON.stringify({ businessTopic }),
          });
          const data = await res.json();
          const newMessage: Message = {
            id: Date.now().toString(),
            sender: "bot",
            content: data.text,
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          setInput("");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setInflight(false);
      }
    },
    [input, stream, inflight]
  );
  const isValidJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  };
  return (
    <div className="mx-auto max-w-2xl border rounded h-screen flex flex-col">
      <div className="w-full p-6 overflow-auto flex-grow">
        <ul className="space-y-2">
          {messages.map((message, index) => {
            let surveyQuestion: string | null = null;
            let surveyAnswers: string[] | null = null;

            if (isValidJson(message.content)) {
              const messageObj = JSON.parse(message.content);
              if (messageObj.surveyAnswers) {
                surveyQuestion = messageObj.surveyAnswers.question;
                surveyAnswers = parseAnswers(
                  JSON.stringify(messageObj.surveyAnswers.answers)
                );
              }
            }

            if (surveyQuestion && surveyAnswers) {
              return (
                <li
                  key={`${message.id}_${index}`}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="relative max-w-xl px-4 py-2 text-gray-600 bg-white rounded-md shadow-md">
                    <div className="mb-2">{surveyQuestion}</div>
                    <div className="flex flex-wrap justify-between">
                      {surveyAnswers.map((answer, index) => (
                        <button
                          key={index}
                          className="px-4 py-2 mr-2 mb-2 bg-blue-500 text-white rounded-md"
                          onClick={() => handleSurveyAnswer(answer)}
                        >
                          {answer}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            } else {
              return (
                <li
                  key={`${message.id}_${index}`}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="relative max-w-xl px-4 py-2 text-gray-600 bg-white rounded-md shadow-md">
                    {message.content}
                  </div>
                </li>
              );
            }
          })}
          <div ref={messagesEndRef} />
        </ul>
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full flex p-3 border-t border-gray-300"
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          className="w-full h-10 px-3 py-2 text-gray-700 placeholder-gray-300 border rounded-md focus:outline-none"
          placeholder="Type a message"
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 text-white bg-blue-500 rounded-full shadow-md hover:bg-blue-600 focus:outline-none"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
