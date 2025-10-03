import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatMessageSchema, type ChatResponse } from "@shared/schema";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const DEFAULT_USER_ID = "default-user";

export async function registerRoutes(app: Express): Promise<Server> {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

  // Ensure default user exists
  const ensureDefaultUser = async () => {
    let user = await storage.getUser(DEFAULT_USER_ID);
    if (!user) {
      user = await storage.upsertUser({
        id: DEFAULT_USER_ID,
        email: 'user@aniverse.ai',
        firstName: 'AniVerse',
        lastName: 'User',
        profileImageUrl: '',
      });
    }
    return user;
  };

  // Initialize default user
  ensureDefaultUser().catch(console.error);

  // User route - returns default user (no auth)
  app.get('/api/auth/user', async (req, res) => {
    try {
      const user = await ensureDefaultUser();
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create a new chat session
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      await ensureDefaultUser();
      
      const sessionData = { 
        title: req.body.title || "New Chat",
        userId: DEFAULT_USER_ID
      };
      const session = await storage.createChatSession(sessionData);
      res.status(200).json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Get all chat sessions
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      await ensureDefaultUser();
      const sessions = await storage.getAllChatSessions(DEFAULT_USER_ID);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Get messages for a session
  app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const messages = await storage.getMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message to Perplexity API
  app.post("/api/chat/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = chatMessageSchema.parse(req.body);

      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      console.log(`[CHAT] Sending message to session ${sessionId}: "${content.substring(0, 50)}..."`);

      // Save user message first
      const userMessage = await storage.createMessage({
        sessionId,
        role: "user",
        content,
      });

      console.log(`[CHAT] User message saved with ID: ${userMessage.id}`);

      // Get conversation history for context
      const messages = await storage.getMessagesBySessionId(sessionId);
      
      // Prepare messages for Perplexity API - limit to last 10 messages
      const recentMessages = messages.slice(-10);
      const perplexityMessages: PerplexityMessage[] = [
        {
          role: "system",
          content: "You are AniVerse AI, an intelligent assistant specialized in anime and manga. You have deep knowledge about anime series, manga titles, characters, storylines, recommendations, and the broader anime/manga culture. Provide detailed, accurate, and engaging responses about anime and manga topics. Be enthusiastic and knowledgeable while maintaining a friendly tone. Always respond to greetings like 'hi', 'hello', 'hey' in a friendly manner."
        },
        ...recentMessages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ];

      if (!PERPLEXITY_API_KEY) {
        console.error("[CHAT] Perplexity API key not configured");
        const errorMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: "Sorry, the AI service is not configured. Please set up the PERPLEXITY_API_KEY environment variable.",
        });
        return res.json({
          message: errorMessage.content,
          sessionId,
        });
      }

      console.log(`[CHAT] Calling Perplexity API with ${perplexityMessages.length} messages`);

      // Call Perplexity API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: perplexityMessages,
            temperature: 0.3,
            top_p: 0.9,
            return_images: false,
            return_related_questions: false,
            stream: false,
            presence_penalty: 0,
            frequency_penalty: 0.1
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!perplexityResponse.ok) {
          const errorText = await perplexityResponse.text();
          const status = perplexityResponse.status;
          console.error(`[CHAT] Perplexity API error ${status}:`, errorText);
          
          let errorContent = "Sorry, I'm having trouble accessing my knowledge base right now. Please try again in a moment.";
          
          if (status === 401) {
            errorContent = "🔑 API Authentication Error\n\nYour Perplexity API key has no credits remaining. To fix this:\n\n1. Go to https://sonar.perplexity.ai/\n2. Check your credit balance\n3. Purchase more credits or add a payment method\n4. Pro users get $5 free credits monthly\n\nNote: API keys only work with a non-zero balance.";
          } else if (status === 429) {
            errorContent = "Sorry, I'm receiving too many requests right now. Please try again in a moment.";
          } else if (status === 400) {
            errorContent = "Sorry, there was an issue with the request format. The API model or parameters may have changed.";
          }
          
          const errorMessage = await storage.createMessage({
            sessionId,
            role: "assistant",
            content: errorContent,
          });
          
          return res.json({
            message: errorMessage.content,
            sessionId,
          });
        }

        const perplexityData: PerplexityResponse = await perplexityResponse.json();
        const aiMessage = perplexityData.choices[0]?.message?.content;

        if (!aiMessage) {
          console.error("[CHAT] Invalid response from Perplexity API");
          const errorMessage = await storage.createMessage({
            sessionId,
            role: "assistant",
            content: "Sorry, I received an invalid response. Please try again.",
          });
          
          return res.json({
            message: errorMessage.content,
            sessionId,
          });
        }

        console.log(`[CHAT] AI response received, length: ${aiMessage.length} characters`);

        // Save AI response
        const assistantMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: aiMessage,
        });

        console.log(`[CHAT] AI message saved with ID: ${assistantMessage.id}`);

        const response: ChatResponse = {
          message: aiMessage,
          sessionId,
        };

        res.json(response);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error("[CHAT] Fetch error:", fetchError);
        
        let errorContent = "Sorry, I'm having trouble connecting right now. Please try again.";
        if (fetchError.name === 'AbortError') {
          errorContent = "The request took too long. Please try again.";
        }
        
        const errorMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: errorContent,
        });
        
        return res.json({
          message: errorMessage.content,
          sessionId,
        });
      }

    } catch (error) {
      console.error("[CHAT] Error in message processing:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Delete a chat session
  app.delete("/api/chat/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      await storage.deleteChatSession(sessionId);
      res.status(200).json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
