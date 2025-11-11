import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatSettings } from "@/components/chat/chat-settings";
import { chatApi } from "@/lib/chat-api";
import { queryClient } from "@/lib/queryClient";

export default function Chat() {
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Get sessions from backend
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ["/api/chat/sessions"],
    queryFn: () => chatApi.getSessions(),
  });

  // Initialize or restore session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Try to get stored session ID from localStorage
        const storedSessionId = localStorage.getItem('currentSessionId');
        
        if (storedSessionId) {
          // Check if this session still exists in backend
          const sessionExists = sessions?.some(s => s.id === storedSessionId);
          
          if (sessionExists) {
            console.log('Restored session from localStorage:', storedSessionId);
            setCurrentSessionId(storedSessionId);
            setIsInitializing(false);
            return;
          } else {
            console.log('Stored session not found in backend, creating new one');
            localStorage.removeItem('currentSessionId');
          }
        }
        
        // If no valid stored session, check if there are existing sessions
        if (sessions && sessions.length > 0) {
          // Use the most recent session
          const latestSession = sessions[0];
          console.log('Using latest session:', latestSession.id);
          setCurrentSessionId(latestSession.id);
          localStorage.setItem('currentSessionId', latestSession.id);
        } else {
          // Create a new session
          console.log('No sessions found, creating new one');
          const newSession = await chatApi.createSession();
          console.log('Created new session:', newSession.id);
          setCurrentSessionId(newSession.id);
          localStorage.setItem('currentSessionId', newSession.id);
          // Refetch sessions to update the list
          refetchSessions();
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    if (!isInitializing || sessions !== undefined) {
      initializeSession();
    }
  }, [sessions, isInitializing, refetchSessions]);

  const handleHistoryClick = () => {
    setShowHistory(true);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleSessionSelect = (sessionId: string) => {
    console.log('Switching to session:', sessionId);
    setCurrentSessionId(sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    setShowHistory(false);
  };

  const handleSessionNotFound = async () => {
    console.log('Session not found, creating new session');
    try {
      // Clear invalid session from localStorage
      localStorage.removeItem('currentSessionId');
      
      // Create a new session
      const newSession = await chatApi.createSession();
      setCurrentSessionId(newSession.id);
      localStorage.setItem('currentSessionId', newSession.id);
      
      // Refetch sessions and messages
      await refetchSessions();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions", newSession.id, "messages"] });
    } catch (error) {
      console.error('Failed to recover from session not found:', error);
    }
  };

  if (isInitializing || !currentSessionId) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-anime-orange mx-auto mb-4"></div>
          <p className="text-gray-400">Loading AniVerse AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white font-body overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 manga-bg opacity-5"></div>
      
      {/* Background Image Overlay */}
      <div className="fixed inset-0 opacity-10 manga-character-bg"></div>
      
      <Navbar 
        onHistoryClick={handleHistoryClick}
        onSettingsClick={handleSettingsClick}
      />
      
      <ChatInterface 
        sessionId={currentSessionId} 
        onSessionNotFound={handleSessionNotFound}
      />
      
      <ChatHistory
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
      
      <ChatSettings
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  );
}
