import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  X,
  RotateCcw,
  Compass,
  Bookmark,
  BarChart3,
  PlusCircle,
  Film,
  ChevronDown,
  MessageSquare,
  HelpCircle,
  Copy,
  Check,
  ArrowRight
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    action: () => void;
  };
}

const QUICK_QUESTIONS = [
  '¿Puedo usar mis listas y estadísticas sin internet?',
  '¿Cómo agrego una película a Mi Lista?',
  '¿Cómo funciona la barra de filtros del Catálogo?',
  '¿Dónde veo mis estadísticas de películas vistas?',
  '¿Cómo calificar una película con estrellas y crítica?',
  '¿Cómo añadir una nueva película a la app?',
  'Recomiéndame una película destacada'
];

export const AIAssistantModal: React.FC = () => {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    closeAssistant,
    assistantInitialPrompt,
    activeTab,
    setActiveTab,
    setIsAddModalOpen,
    myListEntries,
    currentUser,
    userName
  } = useMedia();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `¡Hola ${currentUser ? currentUser.name : userName}! 👋 Soy **ScreenLog AI**, tu asistente inteligente oficial.\n\nEstoy aquí para enseñarte a usar todas las herramientas de la app, guiarte paso a paso para organizar tus películas y darte recomendaciones cinéfilas personalizadas.\n\n¿En qué te puedo ayudar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAssistantOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isAssistantOpen, messages]);

  // Handle initial prompt passed to openAssistant()
  useEffect(() => {
    if (isAssistantOpen && assistantInitialPrompt) {
      handleSendMessage(assistantInitialPrompt);
    }
  }, [isAssistantOpen, assistantInitialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Prepare contextual action suggestion based on query keywords
    let suggestedAction: ChatMessage['suggestedAction'] = undefined;
    const qLower = query.toLowerCase();

    if (qLower.includes('filtro') || qLower.includes('catalogo') || qLower.includes('buscar')) {
      suggestedAction = {
        label: 'Ir al Catálogo y probar filtros',
        action: () => {
          setActiveTab('explorar');
          closeAssistant();
        }
      };
    } else if (qLower.includes('lista') || qLower.includes('mi lista') || qLower.includes('pendiente')) {
      suggestedAction = {
        label: 'Ver Mi Lista personal',
        action: () => {
          setActiveTab('mi_lista');
          closeAssistant();
        }
      };
    } else if (qLower.includes('estadistica') || qLower.includes('grafico') || qLower.includes('barras')) {
      suggestedAction = {
        label: 'Abrir Panel de Estadísticas',
        action: () => {
          setActiveTab('estadisticas');
          closeAssistant();
        }
      };
    } else if (qLower.includes('añadir') || qLower.includes('subir') || qLower.includes('crear')) {
      suggestedAction = {
        label: 'Abrir formulario de Añadir Película',
        action: () => {
          setIsAddModalOpen(true);
          closeAssistant();
        }
      };
    }

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          context: {
            activeTab,
            userName,
            listCount: myListEntries.length
          }
        })
      });

      const data = await response.json();
      const replyText =
        data.reply ||
        '¡Entendido! Si deseas explorar más funciones, puedes navegar entre el Catálogo, Mi Lista o el Panel de Estadísticas en el menú superior.';

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: `¡Hola! Estás usando ScreenLog Pro con soporte offline:\n- **Disponibilidad Total Sin Internet**: Tus listas de películas, calificaciones, notas y estadísticas por género están 100% guardadas en tu navegador (\`localStorage\`). Puedes consultarlas y actualizarlas sin conexión.\n- **Sincronización Automática**: Cualquier cambio que realices sin conexión se añadirá a una cola local y se sincronizará cuando vuelvas a tener internet.\n- **Respaldos**: En Mi Lista puedes exportar o importar copias de seguridad en formato JSON.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        text: `Conversación reiniciada. ¿Qué duda tienes sobre cómo usar la app o qué película te gustaría descubrir?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 group">
        {!isAssistantOpen && (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161618]/95 border border-rose-500/30 text-rose-300 text-xs shadow-2xl backdrop-blur-md opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>¿Necesitas ayuda con la app?</span>
          </div>
        )}

        <button
          id="open-ai-assistant-btn"
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          className={`relative p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
            isAssistantOpen
              ? 'bg-[#161618] text-white border border-rose-500/40'
              : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-rose-900/40 group-hover:scale-105'
          }`}
          title="Abrir Asistente IA de ScreenLog"
        >
          {isAssistantOpen ? (
            <X className="w-6 h-6 text-rose-400" />
          ) : (
            <div className="relative">
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping opacity-80" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Drawer / Window */}
      {isAssistantOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[440px] h-[580px] max-h-[80vh] bg-[#111114]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-rose-950/60 via-[#161618] to-slate-900/60 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-500 text-white shadow-md">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#111114] rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-extrabold text-white text-sm">
                    ScreenLog AI
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold uppercase tracking-wider">
                    Asistente
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Guía interactiva & Recomendaciones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Reiniciar chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={closeAssistant}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Cerrar asistente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Questions Pills */}
          <div className="px-3 py-2 bg-[#0A0A0B]/80 border-b border-white/5 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 flex-shrink-0">
              <HelpCircle className="w-3 h-3 text-rose-400" />
              Preguntas:
            </span>
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-rose-600/20 text-slate-300 hover:text-rose-200 border border-white/5 hover:border-rose-500/30 text-xs whitespace-nowrap transition-all flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 space-y-2 shadow-md leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-rose-600 text-white font-medium rounded-tr-none'
                      : 'bg-[#18181B] text-slate-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line break-words text-xs">
                    {m.text}
                  </div>

                  {/* Suggested Quick Navigation Action if applicable */}
                  {m.suggestedAction && (
                    <div className="pt-2 border-t border-white/10">
                      <button
                        onClick={m.suggestedAction.action}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all active:scale-95"
                      >
                        <span>{m.suggestedAction.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between text-[10px] pt-1 opacity-70 ${
                      m.role === 'user' ? 'text-rose-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        className="hover:text-white flex items-center gap-1 ml-2"
                        title="Copiar respuesta"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-[#18181B] border border-white/10 text-slate-400 text-xs w-fit rounded-tl-none">
                <Bot className="w-4 h-4 text-rose-400 animate-spin" />
                <span>ScreenLog AI está consultando la guía...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[#0A0A0B] border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu pregunta sobre la app..."
                className="flex-1 bg-[#161618] border border-white/10 text-xs text-white placeholder-slate-400 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-rose-500 transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold transition-all shadow-md shadow-rose-900/30 flex-shrink-0"
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
};
