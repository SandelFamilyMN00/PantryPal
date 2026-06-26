# PantryPal

Mobile-first pantry inventory app with Supabase storage and Netlify/OpenAI pantry photo scanning.

## Live stack

- Netlify hosting
- Supabase database
- OpenAI API via Netlify Function

## Required Netlify environment variable

Set this in Netlify site settings:

```text
OPENAI_API_KEY=your_openai_secret_key
```

## Supabase table

The current app uses the `public.pantry_items` table.

## Deploy

Connect this GitHub repo to Netlify. Netlify should use:

- Build command: none
- Publish directory: `.`
- Functions directory: `netlify/functions`

The `netlify.toml` file already contains the needed settings.
