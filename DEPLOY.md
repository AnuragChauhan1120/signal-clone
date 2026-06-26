# Deploy

## Backend: Render

Create a Render Blueprint from this repo. It uses `render.yaml`.

Set this backend env var after Netlify gives you the frontend URL:

```txt
CORS_ORIGINS=https://your-site.netlify.app
```

## Frontend: Netlify

Use:

```txt
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
```

Set these Netlify env vars:

```txt
BACKEND_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_WS_BASE_URL=wss://your-render-backend.onrender.com
```

Leave `NEXT_PUBLIC_API_BASE_URL` empty when using the built-in Next proxy.
