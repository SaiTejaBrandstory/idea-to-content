'use client'

import { useState, useEffect, useRef, Fragment, useLayoutEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  model: string;
  api: string;
  cost: number;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'together', name: 'Together.ai' },
];

export default function ChatPage() {
  // All hooks at the top, no early returns!
  const { user, loading } = useAuth();
  const router = useRouter();
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [models, setModels] = useState<any[]>([]);
  const [featuredModels, setFeaturedModels] = useState<any[]>([]);
  const [model, setModel] = useState<any>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Redirect to home if not logged in (in useEffect)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Fetch models and featured models when provider changes
  useEffect(() => {
    setModels([]);
    setFeaturedModels([]);
    setModel(null);
    setModelInfo(null);
    setModelsError(null);
    setModelsLoading(true);
    fetch(`/api/models?provider=${provider.id}`)
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => {
        setModels(data.models || []);
      })
      .catch(err => {
        setModelsError('Failed to load models: ' + (err.message || err));
      })
      .finally(() => setModelsLoading(false));
    fetch(`/api/featured-models?provider=${provider.id}`)
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => {
        setFeaturedModels(data.featuredModels || []);
      })
      .catch(err => {
        setModelsError('Failed to load featured models: ' + (err.message || err));
      });
  }, [provider]);

  // Set default model when models or featuredModels change
  useEffect(() => {
    if (!model) {
      if (featuredModels.length > 0) {
        setModel(featuredModels[0]);
        setModelInfo(featuredModels[0]);
      } else if (models.length > 0) {
        setModel(models[0]);
        setModelInfo(models[0]);
      }
    }
    // eslint-disable-next-line
  }, [models, featuredModels]);

  // Replace useEffect for scroll with useLayoutEffect
  useLayoutEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    // Only scroll if content overflows
    if (chatArea.scrollHeight > chatArea.clientHeight) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !modelInfo) return;
    setAiError(null);
    setAiLoading(true);
    // Store the model and provider at the time of sending
    const usedModel = modelInfo;
    const usedProvider = provider.id;
    const userMsg: ChatMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      model: usedModel.name || usedModel.id,
      api: usedProvider,
      cost: 0,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
    try {
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          model: usedModel,
          provider: usedProvider,
          messages: [...messages, userMsg],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.aiMessage) {
        throw new Error(data.error || 'Failed to get AI response');
      }
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        text: data.aiMessage,
        sender: 'ai',
        model: usedModel.name || usedModel.id,
        api: usedProvider,
        cost: 0,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setAiError(err.message || 'Failed to get AI response');
    } finally {
      setAiLoading(false);
    }
  };

  // Compose model dropdown options: featured first, then all others
  const featuredIds = new Set(featuredModels.map((m) => m.id));
  const regularModels = models.filter((m) => !featuredIds.has(m.id));

  // After all hooks, do the auth check and return null if not logged in
  if (!user && !loading) return null;

  return (
    <div className="bg-gray-50 flex flex-col min-h-screen">
      {/* Chat messages area */}
      <div ref={chatAreaRef} className="flex-1 overflow-y-auto scrollbar-thin px-2 md:px-8 py-2 space-y-2 text-sm" style={{ maxHeight: '100%', minHeight: 0 }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-3xl inline-block px-4 py-2 rounded-2xl shadow-md text-sm whitespace-pre-line ${
                msg.sender === "user"
                  ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-br-md"
                  : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
              }`}
            >
              <div className="mb-1">
                <span className="font-semibold text-[11px] mr-2">{msg.sender === "user" ? "You" : "AI"}</span>
                <span className="text-[11px] text-gray-400">[{msg.model} / {msg.api}]</span>
              </div>
              <div className="text-sm">
                <ReactMarkdown
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code(props) {
                      const { children, className } = props;
                      // @ts-ignore
                      const isInline = props.inline;
                      return isInline ? (
                        <code className="bg-gray-200 text-pink-700 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
                      ) : (
                        <pre className="bg-gray-900 text-green-200 rounded-xl p-4 overflow-x-auto my-2 text-[13px] font-mono">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    }
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {aiLoading && (
          <div className="flex justify-start">
            <div className="max-w-3xl inline-block px-4 py-2 rounded-2xl shadow-md text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded-bl-md animate-pulse">
              AI is typing...
            </div>
          </div>
        )}
        {aiError && (
          <div className="flex justify-start">
            <div className="max-w-3xl inline-block px-4 py-2 rounded-2xl shadow-md text-sm bg-red-100 text-red-600 border border-red-200 rounded-bl-md">
              {aiError}
            </div>
          </div>
        )}
      </div>
      {/* Custom thin scrollbar styles */}
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a3a3a3;
        }
        .shimmer {
          background: linear-gradient(90deg, #f3f3f3 25%, #e5e7eb 50%, #f3f3f3 75%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {/* Model selection and input bar (compact, sticky at bottom) */}
      <div className="sticky bottom-0 w-full bg-white border-t z-10">
        <div className="flex flex-col sm:flex-row gap-2 items-center px-2 py-2 md:px-8 md:py-3">
          {/* Error and loading states */}
          {modelsError && !modelsLoading && (
            <div className="w-full text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2 text-center">
              {modelsError}
            </div>
          )}
          {/* Provider select */}
          <div className="w-full sm:w-64 h-10 text-xs">
            {modelsLoading ? (
              <div className="w-full h-10 rounded border bg-gray-100 animate-pulse shimmer" />
            ) : (
              <Listbox value={provider} onChange={setProvider} disabled={modelsLoading}>
                <div className="relative h-10">
                  <Listbox.Button className="relative w-full h-10 cursor-pointer rounded border bg-white py-1 pl-3 pr-8 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs min-w-[12rem]">
                    <span className="block truncate">{provider.name}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-10 bottom-full right-0 origin-top-right mb-1 max-h-60 w-64 min-w-[12rem] overflow-auto rounded bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {PROVIDERS.map((p) => (
                        <Listbox.Option
                          key={p.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-1 pl-8 pr-4 ${active ? "bg-violet-100 text-violet-900" : "text-gray-900"}`
                          }
                          value={p}
                        >
                          {({ selected }) => (
                            <>
                              <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>{p.name}</span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-violet-600">
                                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            )}
          </div>
          {/* Model select */}
          <div className="w-full sm:w-64 h-10 text-xs">
            {modelsLoading ? (
              <div className="w-full h-10 rounded border bg-gray-100 animate-pulse shimmer" />
            ) : (
              <Listbox value={model} onChange={m => { setModel(m); setModelInfo(m); }} disabled={modelsLoading || featuredModels.length + regularModels.length === 0}>
                <div className="relative h-10">
                  <Listbox.Button className="relative w-full h-10 cursor-pointer rounded border bg-white py-1 pl-3 pr-8 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs min-w-[12rem]">
                    <span className="block truncate">{model ? (model.name || model.id) : "Select model"}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-10 bottom-full right-0 origin-top-right mb-1 max-h-60 w-64 min-w-[12rem] overflow-auto rounded bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {featuredModels.length > 0 && (
                        <div className="px-3 py-1 text-xs font-semibold bg-violet-50 text-violet-700">Featured</div>
                      )}
                      {featuredModels.map((m) => (
                        <Listbox.Option
                          key={m.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-1 pl-8 pr-4 ${active ? "bg-violet-50 text-violet-700" : "text-violet-700"}`
                          }
                          value={m}
                        >
                          {({ selected }) => (
                            <>
                              <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>{m.name || m.id}</span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-violet-600">
                                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                      {regularModels.length > 0 && (
                        <div className="px-3 py-1 text-xs font-semibold bg-gray-50 text-gray-700">All Models</div>
                      )}
                      {regularModels.map((m) => (
                        <Listbox.Option
                          key={m.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-1 pl-8 pr-4 ${active ? "bg-gray-100 text-gray-900" : "text-gray-900"}`
                          }
                          value={m}
                        >
                          {({ selected }) => (
                            <>
                              <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>{m.name || m.id}</span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-violet-600">
                                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            )}
          </div>
          {/* Chat input */}
          <form
            className="flex-1 flex items-end gap-2 w-full"
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
          >
            <textarea
              ref={textareaRef}
              className="flex-1 w-full p-2 border rounded resize-none text-xs min-h-[40px] max-h-[144px]"
              rows={1}
              placeholder="Type your message..."
              value={input}
              onChange={e => {
                setInput(e.target.value);
                const ta = e.target as HTMLTextAreaElement;
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ minHeight: '40px', maxHeight: '144px', overflowY: 'auto' }}
              autoFocus
            />
            <button
              type="submit"
              className="bg-violet-600 text-white px-4 h-10 rounded hover:bg-violet-700 transition text-xs"
              disabled={!input.trim() || !modelInfo}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 