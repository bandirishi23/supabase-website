# Supabase Edge Function Setup for SendGrid

## Overview
To avoid CORS issues when calling SendGrid from the browser, we use a Supabase Edge Function as a proxy. This function runs server-side and securely handles the SendGrid API calls.

## Setup Instructions

### 1. Install Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# npm/npx alternative
npx supabase --version
```

### 2. Link to Your Supabase Project
```bash
# Initialize Supabase in your project directory
npx supabase init

# Link to your remote project
npx supabase link --project-ref ijjdclfibcjvnpxfcglc
```

### 3. Set SendGrid API Key as Secret
```bash
# Set the SendGrid API key as an environment variable for the Edge Function
npx supabase secrets set SENDGRID_API_KEY=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
```

### 4. Deploy the Edge Function
```bash
# Deploy the send-email function
npx supabase functions deploy send-email
```

### 5. Test the Function
```bash
# Test locally (optional)
npx supabase functions serve send-email

# Test the deployed function
curl -L -X POST 'https://ijjdclfibcjvnpxfcglc.supabase.co/functions/v1/quick-api' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{"to":"test@example.com","from":"sender@yourdomain.com","fromName":"Test Sender","subject":"Test Email","html":"<h1>Test</h1>"}'
```

## How It Works

1. **Frontend**: Calls `sendEmailOfficial()` which invokes the Supabase Edge Function
2. **Edge Function**: Receives the email data and calls SendGrid API server-side
3. **SendGrid**: Processes and sends the email
4. **Response**: Returns success/error status back to the frontend

## Benefits

- ✅ No CORS issues
- ✅ API key stays secure on the server
- ✅ Centralized email logic
- ✅ Built-in authentication with Supabase
- ✅ Scalable and serverless

## Troubleshooting

### Function Not Found Error
Make sure you've deployed the function:
```bash
npx supabase functions deploy send-email
```

### Authentication Error
Ensure your Supabase client is properly configured with the correct URL and anon key.

### SendGrid Error
Check that:
1. Your SendGrid API key is correctly set as a secret
2. Your sender email is verified in SendGrid
3. You have sufficient SendGrid credits/quota

## Local Development

For local development without deploying:
```bash
# Start local Supabase
npx supabase start

# Serve functions locally
npx supabase functions serve

# Your app will automatically use local functions when REACT_APP_SUPABASE_URL points to local
```

## Alternative: Direct Database Function

If you prefer not to use Edge Functions, you can create a database function instead:

```sql
-- Create a function in Supabase SQL Editor
CREATE OR REPLACE FUNCTION send_email(
  email_to TEXT,
  email_from TEXT,
  from_name TEXT,
  subject TEXT,
  html_content TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  -- This would need to use pg_net extension to make HTTP calls
  -- Or integrate with a webhook service
  RETURN json_build_object('success', true, 'message', 'Email queued');
END;
$$;
```

## Support

For more information:
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [SendGrid API Docs](https://docs.sendgrid.com/api-reference/mail-send/mail-send)