'use client'

import { useState, useEffect, useRef, Fragment, useLayoutEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Plus, MessageSquare, Clock, DollarSign, X } from 'lucide-react';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  model: string;
  api: string;
  cost: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  total_messages: number;
  total_cost_usd: number;
  total_cost_inr: number;
  total_tokens: number;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'together', name: 'Together.ai' },
];

// Utility to preprocess markdown: remove all empty/whitespace-only lines and collapse multiple blank lines
function compactMarkdown(text: string) {
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n')
    .replace(/\n{2,}/g, '\n\n');
}

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
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Set mounted state after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to home if not logged in (in useEffect)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Load sessions when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchSessions();
    }
  }, [user, loading]);

  // Set current session from URL (removed - no longer needed)
  // useEffect(() => {
  //   if (sessionIdFromUrl) {
  //     setCurrentSessionId(sessionIdFromUrl);
  //     loadSession(sessionIdFromUrl);
  //   }
  // }, [sessionIdFromUrl]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/chat/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        // Convert database messages to chat format
        const chatMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: Date.now() + Math.random(),
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'ai',
          model: msg.model_name || msg.model_id,
          api: msg.api_provider,
          cost: msg.total_cost_usd || 0,
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      });
      if (response.ok) {
        const data = await response.json();
        const newSessionId = data.session.id;
        setCurrentSessionId(newSessionId);
        setMessages([]);
        setSessions(prev => [data.session, ...prev]);
        // No longer update URL
        // router.push(`/chat?session=${newSessionId}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (response.ok) {
        // Update local sessions list
        setSessions(prev => prev.map(session => 
          session.id === sessionId ? { ...session, title } : session
        ));
      }
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  };

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

  // Always scroll to the bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !modelInfo) return;
    setAiError(null);
    setAiLoading(true);
    
    // Create session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const response = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' })
        });
        if (response.ok) {
          const data = await response.json();
          sessionId = data.session.id;
          setCurrentSessionId(sessionId);
          setSessions(prev => [data.session, ...prev]);
          router.push(`/chat?session=${sessionId}`);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    }

    // Store the model and provider at the time of sending
    const usedModel = modelInfo;
    const usedProvider = provider.id;
    console.log('Sending message with provider:', { 
      provider: usedProvider, 
      model: usedModel.name || usedModel.id,
      modelId: usedModel.id 
    });
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
          sessionId: sessionId,
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
      
      // Refresh sessions to update costs
      fetchSessions();
      
      // Update session title based on first user message
      if (messages.length === 0 && sessionId) {
        const title = userMsg.text.length > 50 
          ? userMsg.text.substring(0, 50) + '...' 
          : userMsg.text;
        updateSessionTitle(sessionId, title);
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to get AI response');
    } finally {
      setAiLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Compose model dropdown options: featured first, then all others
  const featuredIds = new Set(featuredModels.map((m) => m.id));
  const regularModels = models.filter((m) => !featuredIds.has(m.id));

  // After all hooks, do the auth check and return null if not logged in
  if (!user && !loading) return null;

  return (
    <div className="bg-gray-50 flex h-screen">
      {/* Sidebar */}
      {mounted && (
        <div className={`w-80 bg-white border-r border-gray-200 flex flex-col ${sidebarOpen ? 'block' : 'hidden'} md:block`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
              <button
                onClick={createNewSession}
                className="bg-violet-600 text-white p-2 rounded-lg hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loadingSessions ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No chat sessions yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-violet-100 border border-violet-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    loadSession(session.id);
                    // No longer update URL
                    // router.push(`/chat?session=${session.id}`);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {session.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {session.total_messages} msgs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(session.updated_at)}</span>
                    <span>{formatCurrency(session.total_cost_usd)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mobile sidebar toggle */}
      {mounted && (
        <div className="md:hidden fixed top-20 left-4 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white p-2 rounded-lg shadow-lg border"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {mounted && sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-80 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={createNewSession}
                    className="bg-violet-600 text-white p-2 rounded-lg hover:bg-violet-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-violet-100 border border-violet-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    loadSession(session.id);
                    // No longer update URL
                    // router.push(`/chat?session=${session.id}`);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {session.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {session.total_messages} msgs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(session.updated_at)}</span>
                    <span>{formatCurrency(session.total_cost_usd)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
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
                  <div className="chat-markdown">
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
                      {compactMarkdown(msg.text)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
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
          .chat-markdown {
            line-height: 1.3;
          }
          .chat-markdown p,
          .chat-markdown ul,
          .chat-markdown ol,
          .chat-markdown li,
          .chat-markdown blockquote,
          .chat-markdown h1,
          .chat-markdown h2,
          .chat-markdown h3,
          .chat-markdown h4,
          .chat-markdown h5,
          .chat-markdown h6 {
            margin: 0.05em 0 0.05em 0 !important;
            min-height: 0;
          }
          .chat-markdown ul,
          .chat-markdown ol {
            padding-left: 1em;
          }
          .chat-markdown blockquote {
            padding-left: 0.4em;
            border-left: 2px solid #e5e7eb;
            color: #6b7280;
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
                          <>
                            <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">Featured Models</div>
                            {featuredModels.map((m) => (
                              <Listbox.Option
                                key={m.id}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-1 pl-8 pr-4 ${active ? "bg-violet-100 text-violet-900" : "text-gray-900"}`
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
                          </>
                        )}
                        {regularModels.length > 0 && (
                          <>
                            <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">All Models</div>
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
                          </>
                        )}
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
    </div>
  );
} 