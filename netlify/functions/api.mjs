import express from 'express';
import serverless from 'serverless-http';
import crypto from 'crypto';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

console.log('[NETLIFY] Function starting...');
console.log('[NETLIFY] PERPLEXITY_API_KEY configured:', !!PERPLEXITY_API_KEY);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// In-memory storage for conversations (per function instance)
const conversations = new Map();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasPerplexityKey: !!PERPLEXITY_API_KEY,
    mode: 'serverless-netlify'
  });
});

// User endpoint (no auth required)
app.get('/api/auth/user', (req, res) => {
  res.json({
    id: 'default-user',
    email: 'user@aniverse.ai',
    firstName: 'AniVerse',
    lastName: 'User',
    profileImageUrl: ''
  });
});

// Create chat session
app.post("/api/chat/sessions", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const session = {
      id,
      title: req.body.title || "New Chat",
      userId: "default-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Initialize empty conversation
    conversations.set(id, []);
    
    console.log(`[NETLIFY] Created session: ${id}`);
    res.json(session);
  } catch (error) {
    console.error("[NETLIFY] Error creating session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// Get all sessions
app.get("/api/chat/sessions", async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error("[NETLIFY] Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

// Get messages for a session
app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`[NETLIFY] Fetching messages for session: ${sessionId}`);
    
    let sessionMessages = conversations.get(sessionId);
    
    // Initialize with greeting if no messages
    if (!sessionMessages || sessionMessages.length === 0) {
      const greetingMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        content: "Hello! I'm AniVerse AI, your anime and manga companion. What would you like to discuss today?",
        timestamp: new Date().toISOString()
      };
      sessionMessages = [greetingMessage];
      conversations.set(sessionId, sessionMessages);
    }
    
    res.json(sessionMessages);
  } catch (error) {
    console.error("[NETLIFY] Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message
app.post("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    console.log(`[NETLIFY] Processing message for session ${sessionId}`);

    // Get or initialize conversation
    let sessionMessages = conversations.get(sessionId) || [];
    
    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      content: content,
      timestamp: new Date().toISOString()
    };
    sessionMessages.push(userMessage);

    let aiResponse = "";

    // Check if API key is configured
    if (!PERPLEXITY_API_KEY || PERPLEXITY_API_KEY.length < 10) {
      console.error("[NETLIFY] PERPLEXITY_API_KEY not configured properly");
      aiResponse = "Sorry, the AI service is not configured. Please set up your PERPLEXITY_API_KEY in Netlify environment variables.";
    } else {
      try {
        console.log('[NETLIFY] Calling Perplexity API');
        
        // Prepare messages for API (last 8 messages for context)
        const recentMessages = sessionMessages.slice(-8);
        const perplexityMessages = [
          {
            role: "system",
            content: "You are AniVerse AI, an intelligent assistant specialized in anime and manga. You have deep knowledge about anime series, manga titles, characters, storylines, recommendations, and the broader anime/manga culture. Provide detailed, accurate, and engaging responses about anime and manga topics. Be enthusiastic and knowledgeable while maintaining a friendly tone. Always respond to greetings like 'hi', 'hello', 'hey' in a friendly manner."
          },
          ...recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ];
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        
        const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json"
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

        if (perplexityResponse.ok) {
          const data = await perplexityResponse.json();
          aiResponse = data.choices?.[0]?.message?.content;
          
          if (!aiResponse) {
            console.error('[NETLIFY] No content in API response');
            aiResponse = "Sorry, I received an empty response. Please try again.";
          } else {
            console.log(`[NETLIFY] AI response received: ${aiResponse.length} chars`);
          }
        } else {
          const status = perplexityResponse.status;
          const errorText = await perplexityResponse.text();
          console.error(`[NETLIFY] Perplexity API error ${status}:`, errorText);
          
          if (status === 401) {
            aiResponse = "Sorry, there's an authentication issue with the AI service. Please check your API key configuration.";
          } else if (status === 429) {
            aiResponse = "Sorry, I'm receiving too many requests right now. Please try again in a moment.";
          } else {
            aiResponse = "Sorry, I'm having trouble accessing my knowledge base right now. Please try again in a moment.";
          }
        }
      } catch (apiError) {
        console.error("[NETLIFY] Perplexity API call failed:", apiError);
        
        if (apiError.name === 'AbortError') {
          aiResponse = "Sorry, that request took too long. Please try asking again.";
        } else if (apiError.message?.includes('fetch')) {
          aiResponse = "Sorry, I'm having trouble connecting to the AI service. Please check your internet connection.";
        } else {
          aiResponse = "Sorry, an unexpected error occurred. Please try again.";
        }
      }
    }
    
    // Add AI response
    const aiMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString()
    };
    sessionMessages.push(aiMessage);
    
    // Store updated conversation
    conversations.set(sessionId, sessionMessages);

    res.json({
      message: aiResponse,
      sessionId: sessionId,
    });

  } catch (error) {
    console.error("[NETLIFY] Error processing message:", error);
    res.status(500).json({ 
      error: "Failed to process message",
      details: error.message
    });
  }
});

// Delete session
app.delete("/api/chat/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    conversations.delete(sessionId);
    console.log(`[NETLIFY] Deleted session: ${sessionId}`);
    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("[NETLIFY] Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete chat session" });
  }
});

// Catch all for undefined routes
app.use('/api/*', (req, res) => {
  console.log(`[NETLIFY] 404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

export const handler = serverless(app);
