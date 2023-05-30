"use client";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { FormEvent, useCallback, useState, ChangeEvent } from "react";

export const runtime = "edge";

interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
}

const Chat: React.FC = () => {
  const [stream, setStream] = useState<boolean>(true);

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inflight, setInflight] = useState<boolean>(false);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (inflight) return;

      const userMessage: Message = { id: Date.now().toString(), sender: 'user', content: input };
      setMessages((prev) => [...prev, userMessage]);

      setInflight(true);

      try {
        if (stream) {
          let botMessage = "";
          let isFirstChunk = true; 
          await fetchEventSource(`/api/generate`, {
            method: "POST",
            body: JSON.stringify({ input }),
            headers: { "Content-Type": "application/json" },
            onmessage(ev) {
              const newChunk = ev.data;
              if (isFirstChunk) {
                const botMessage: Message = { id: Date.now().toString(), sender: 'bot', content: newChunk };
                setMessages((prevMessages) => [...prevMessages, botMessage]);
                isFirstChunk = false;
              } else {
                botMessage += newChunk;
                setMessages((prevMessages) => {
                  const updatedMessages = prevMessages.map((message) => {
                    if (message.id === prevMessages[prevMessages.length - 1].id) {
                      return { ...message, content: botMessage };
                    }
                    return message;
                  });
                  return updatedMessages;
                });
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
          const newMessage: Message = { id: Date.now().toString(), sender: 'bot', content: data.text };
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
    <div className="container mx-auto max-w-2xl border rounded bg-gradient-to-r from-gray-500 to-red-500">

      <div className="relative w-full p-6 overflow-y-auto h-[40rem]">
        <ul className="space-y-2">
          {messages.map(message => (
            <li key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="relative max-w-xl px-4 py-2 text-gray-600 bg-white rounded-md shadow-md">
                {message.content}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={onSubmit} className="relative flex items-center p-3 border-t border-gray-300">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          className="w-full h-10 px-3 py-2 text-gray-700 placeholder-gray-300 border rounded-md focus:outline-none"
          placeholder="Type a message"
        />
        <button type="submit" className="ml-2 px-4 py-2 text-white bg-blue-500 rounded-full shadow-md hover:bg-blue-600 focus:outline-none">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
