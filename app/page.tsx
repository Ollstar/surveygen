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
  type: "initial" | "pre-stream" | "streamed" | "user";
}

const Chat: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now().toString(),
      sender: "bot",
      content: "Describe your business.",
      type: "initial",
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
    "Give me a moment to come up with some survey answers for that question! 💡",
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
        type: "user",
      };
      setMessages((prev) => [...prev, userMessage]);

      const startStreamMessage: Message = {
        id: Date.now().toString(),
        sender: "bot",
        content: `Coming up with a business goal 🤓.`,
        type: "pre-stream",
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
                  type: "pre-stream",
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
                    type: "streamed",
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
            type: "streamed",
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
    <div className="chat-container">
      <div className="chat-messages">
        <ul className="space-y-2">
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1; // Check if this message is the last one
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
                  <div
                    className={`message-container ${
                      message.sender === "bot"
                        ? "message-container-bot-" + message.type
                        : "message-container-user"
                    } ${isLastMessage ? "holographic-effect" : ""}`} // Apply the holographic effect if it's the last message
                  >
                    <div className="mb-2">{surveyQuestion}</div>
                    <div className="button-grid">
                      {surveyAnswers.map((answer, index) => (
                        <button
                          key={index}
                          className="message-container streamed-response"
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
                  <div
                    className={`message-container ${
                      message.sender === "bot"
                        ? "message-container-bot-" + message.type
                        : "message-container-user"
                    } ${isLastMessage ? "holographic-effect" : ""}`} // Apply the holographic effect if it's the last message
                  >
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
          className="message-input"
          placeholder="Type a message"
        />
        <button
          type="submit"
          className={
            input.trim() !== "" ? "send-button" : "send-button-disabled"
          }
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
