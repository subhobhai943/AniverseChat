# Netlify Deployment Guide for AniVerse AI

## Overview
This app is configured for serverless deployment on Netlify with no authentication required.

## Setup Steps

### 1. Environment Variables
In your Netlify dashboard, set the following environment variable:

```
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

**Important**: The app will not work without this API key. Get your key from [Perplexity AI](https://www.perplexity.ai/).

### 2. Build Settings
Netlify should auto-detect these settings from `netlify.toml`, but verify:

- **Build command**: `npm ci && npm run build`
- **Publish directory**: `dist/public`
- **Functions directory**: `netlify/functions`
- **Node version**: 20

### 3. Deploy
1. Connect your GitHub repository to Netlify
2. Configure the environment variable (PERPLEXITY_API_KEY)
3. Deploy!

## How It Works

### Frontend
- Built with React, TypeScript, and Vite
- Deployed to `dist/public`
- All API calls are routed to serverless functions via redirects

### Backend (Serverless Functions)
- Located in `netlify/functions/api.mjs`
- Handles all `/api/*` routes
- Uses in-memory storage (per function instance)
- No authentication required

### API Routes
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions` - Get all sessions
- `GET /api/chat/sessions/:id/messages` - Get messages for a session
- `POST /api/chat/sessions/:id/messages` - Send message to AI
- `DELETE /api/chat/sessions/:id` - Delete a session

## Important Notes

1. **No Authentication**: The app works without any login system
2. **Stateless**: Sessions are stored in memory (per function instance) and may be lost on cold starts
3. **API Key Required**: You MUST set the PERPLEXITY_API_KEY environment variable
4. **Model Used**: Uses Perplexity's "sonar" model optimized for online knowledge

## Troubleshooting

### "Sorry, I'm having trouble accessing my knowledge base"
- Check that PERPLEXITY_API_KEY is set in Netlify environment variables
- Verify the API key is valid and has credits
- Check Netlify function logs for detailed error messages

### Session Lost After Inactivity
- This is expected behavior for serverless functions
- Sessions are stored in memory and cleared on cold starts
- Each new session gets a fresh greeting message

### Build Failures
- Ensure Node.js 20 is selected in Netlify settings
- Check that all dependencies are listed in package.json
- Clear Netlify cache and redeploy if needed

## Local Development
For local development (Replit):
```bash
npm run dev
```

The app runs on port 5000 with both frontend and backend together.

## Deployment Differences

| Feature | Replit (Dev) | Netlify (Production) |
|---------|--------------|---------------------|
| Backend | Express server | Serverless functions |
| Database | PostgreSQL | In-memory (function instance) |
| Port | 5000 | N/A (serverless) |
| Authentication | None | None |
| Session Storage | Database | In-memory |
