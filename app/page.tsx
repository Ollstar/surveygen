"use client";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { FormEvent, useCallback, useState, ChangeEvent, useRef } from "react";

export const runtime = "edge";

interface Message {
  id: string;
  sender: "user" | "bot";
  content: string;
}

const Chat: React.FC = () => {
  const [stream, setStream] = useState<boolean>(true);

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now().toString(),
      sender: "bot",
      content: "Enter a movie title",
    },
  ]);
  const [inflight, setInflight] = useState<boolean>(false);
  const botMessageRef = useRef<{ id: string; content: string } | null>(null);
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

      setInflight(true);

      try {
        if (stream) {
          let isFirstChunk = true;
          await fetchEventSource(`/api/generate`, {
            method: "POST",
            body: JSON.stringify({ input }),
            headers: { "Content-Type": "application/json" },
            onmessage(ev) {
              const newChunk = ev.data;
              if (newChunk === "event: firstStreamEnded") {
                // We need to make a bunch of different events for each chain in the sequence
                // Reset bot message reference
                botMessageRef.current = null;
                isFirstChunk = true;
              } else {
                if (isFirstChunk) {
                  // Create new bot message, store it in the ref, and add it to the state
                  const botMessage: Message = {
                    id: Date.now().toString(),
                    sender: "bot",
                    content: newChunk,
                  };
                  botMessageRef.current = {
                    id: botMessage.id,
                    content: newChunk,
                  };
                  setMessages((prevMessages) => [...prevMessages, botMessage]);
                  isFirstChunk = false;
                } else {
                  // Append new chunk to the current bot message
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
          const res = await fetch(`/api/generate`, {
            method: "POST",
            body: JSON.stringify({ input }),
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
    [input, stream, inflight, messages]
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="container mx-auto max-w-2xl border rounded h-screen flex flex-col overflow-hidden">
      <div className="relative w-full p-6 overflow-hidden flex-grow flex flex-col">
        <ul className="space-y-2 flex-grow flex flex-col overflow-auto">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="relative max-w-xl px-4 py-2 text-gray-600 bg-white rounded-md shadow-md">
                {message.content}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <form
        onSubmit={onSubmit}
        className="fixed bottom-0 right-0 left-0 flex items-center p-3 border-t border-gray-300"
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
