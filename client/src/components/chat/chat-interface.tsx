import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble, TypingIndicator } from "./message-bubble";
import { chatApi, type Message } from "@/lib/chat-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, ArrowDown, Star, Book, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import animeAvatar from "@assets/a3922c432494e8836b1e11e9722c7115_1755968455298.jpg";

interface ChatInterfaceProps {
  sessionId: string;
  onSessionNotFound?: () => void;
}

export function ChatInterface({ sessionId, onSessionNotFound }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ["/api/chat/sessions", sessionId, "messages"],
    queryFn: async () => {
      try {
        return await chatApi.getMessages(sessionId);
      } catch (err: any) {
        // If session not found (404), trigger recovery
        if (err.message?.includes('404') || err.message?.includes('Session not found')) {
          console.log('Session not found, triggering recovery...');
          if (onSessionNotFound) {
            onSessionNotFound();
          }
          return [];
        }
        throw err;
      }
    },
    enabled: !!sessionId,
    retry: 1,
    staleTime: 5000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(sessionId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions", sessionId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      scrollToBottom();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const handleScroll = (event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    setShowScrollButton(!isNearBottom);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputValue.trim();
    if (content && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(content);
      setInputValue("");
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
  };

  // Handle session errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Session Error",
        description: "Unable to load messages. Creating a new chat session...",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <main className="relative z-10 flex flex-col h-screen pt-16">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col min-h-0">
        
        {/* Welcome Section - Only show when no messages */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center mb-8">
            <div className="glass-surface rounded-2xl p-8 mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-anime-orange overflow-hidden">
                <img src={animeAvatar} alt="AniVerse AI" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">Welcome to AniVerse AI</h2>
              <p className="text-gray-400 text-lg">Your intelligent companion for everything Manga & Anime</p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <span className="px-3 py-1 bg-dark-surface rounded-full text-xs text-gray-300 border border-dark-border">Manga Recommendations</span>
                <span className="px-3 py-1 bg-dark-surface rounded-full text-xs text-gray-300 border border-dark-border">Character Analysis</span>
                <span className="px-3 py-1 bg-dark-surface rounded-full text-xs text-gray-300 border border-dark-border">Plot Discussions</span>
                <span className="px-3 py-1 bg-dark-surface rounded-full text-xs text-gray-300 border border-dark-border">Anime Reviews</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Chat Messages Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 mb-6 custom-scrollbar min-h-0"
          onScrollCapture={handleScroll}
        >
          <div className="space-y-4 pr-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-anime-orange"></div>
              </div>
            ) : (
              messages.map((message: Message, index: number) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isLatest={index === messages.length - 1}
                />
              ))
            )}
            
            {/* Typing Indicator */}
            {sendMessageMutation.isPending && <TypingIndicator />}
          </div>
        </ScrollArea>
        
        {/* Input Area */}
        <div className="glass-surface rounded-2xl p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Ask about your favorite manga or anime..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-anime-orange focus:border-transparent transition-all duration-200"
                disabled={sendMessageMutation.isPending}
                data-testid="input-message"
              />
            </div>
            <Button
              type="submit"
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              className="send-button px-6 py-3 rounded-xl text-white font-medium flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-send"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What are the top anime series of 2024?")}
              className="px-3 py-1 bg-dark-surface hover:bg-dark-border rounded-lg text-xs text-gray-300 transition-colors border border-dark-border"
              data-testid="button-quick-top-anime"
            >
              <Star className="w-3 h-3 mr-1" />
              Top Anime 2024
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Can you recommend some manga similar to my favorite series?")}
              className="px-3 py-1 bg-dark-surface hover:bg-dark-border rounded-lg text-xs text-gray-300 transition-colors border border-dark-border"
              data-testid="button-quick-manga-recs"
            >
              <Book className="w-3 h-3 mr-1" />
              Manga Recommendations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Tell me about character development in popular anime series")}
              className="px-3 py-1 bg-dark-surface hover:bg-dark-border rounded-lg text-xs text-gray-300 transition-colors border border-dark-border"
              data-testid="button-quick-character-analysis"
            >
              <Users className="w-3 h-3 mr-1" />
              Character Analysis
            </Button>
          </div>
        </div>
      </div>
      
      {/* Floating Actions */}
      <div className="fixed bottom-24 right-6 flex flex-col space-y-2 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToBottom}
          className={cn(
            "w-12 h-12 bg-dark-surface border border-dark-border rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-dark-border transition-all duration-200 shadow-lg backdrop-blur-sm",
            !showScrollButton && "hidden"
          )}
          data-testid="button-scroll-bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
    </main>
  );
}
