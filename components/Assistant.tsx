
import React, { useState, useRef, useEffect } from 'react';
import { GameData, Message } from '../types';
import { streamAssistantResponse } from '../geminiService';
import { Icons } from './Icons';

interface AssistantProps {
    gameData: GameData;
}

const Assistant: React.FC<AssistantProps> = ({ gameData }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm your Assistant Manager. I can help you with strategy, player analysis, or general advice. How can I help you today?", sender: 'bot' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const botMessageId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: botMessageId, text: '', sender: 'bot' }]);
            
            const stream = streamAssistantResponse(userMessage.text, messages, gameData);
            
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullResponse } : m));
            }
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, I couldn't process that request.", sender: 'bot' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="p-4 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-2xl font-bold text-center mb-4">Assistant Manager</h2>
            <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-4 shadow-inner">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${msg.sender === 'user' ? 'bg-teal-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg rounded-bl-none shadow-sm">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about strategy, players, or opponents..."
                    className="flex-grow p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-lg shadow-lg disabled:opacity-50 transition-colors"
                >
                    <Icons.Play className="h-6 w-6" /> {/* Reusing Play icon as send icon for now, looks like an arrow */}
                </button>
            </div>
        </div>
    );
};

export default Assistant;
