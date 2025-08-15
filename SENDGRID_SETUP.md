# SendGrid Setup Guide for DFW LANDS

## 1. Environment Variable Setup

Add your SendGrid API key to the `.env` file:

```bash
REACT_APP_SENDGRID_API_KEY=SG.your_actual_api_key_here
```

## 2. Installation

The SendGrid package has already been installed:
```bash
npm install @sendgrid/mail
```

## 3. Configuration

The application uses the official SendGrid Node.js SDK. The integration is located in:
- `/src/services/sendgrid-official.ts` - Official SendGrid SDK implementation
- `/src/services/sendgrid.ts` - Legacy implementation (for backward compatibility)

## 4. Features

### Test Email
- Go to **Email Settings** page
- Enter your sender email and name
- Click "Send Test Email" to verify configuration

### Sending Emails
The application supports:
- Single email sending
- Batch email sending with rate limiting
- HTML email templates
- Progress tracking
- Error handling

## 5. SendGrid Requirements

Before sending emails, ensure you have:
1. **SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com)
2. **Sender Authentication**: Complete either:
   - Domain Authentication (recommended for production)
   - Single Sender Verification (for testing)
3. **API Key**: Create an API key with "Mail Send" permissions

## 6. EU Data Residency (Optional)

If you need EU data residency, uncomment this line in `/src/services/sendgrid-official.ts`:
```typescript
// sgMail.setDataResidency('eu')
```

## 7. Usage Example

```typescript
import { sendEmailOfficial } from './services/sendgrid-official'

// Send a single email
const result = await sendEmailOfficial({
  to: 'recipient@example.com',
  from: 'sender@yourdomain.com',
  fromName: 'Your Name',
  subject: 'Property Opportunity',
  html: '<h1>Great property deal!</h1><p>Check out this opportunity...</p>'
})

if (result.success) {
  console.log('Email sent successfully!')
} else {
  console.error('Failed to send:', result.error)
}
```

## 8. Troubleshooting

### Common Issues:

1. **"SendGrid API key not configured"**
   - Ensure `REACT_APP_SENDGRID_API_KEY` is set in `.env`
   - Restart the development server after adding the key

2. **"The from address does not match a verified Sender Identity"**
   - Complete sender verification in SendGrid dashboard
   - Use a verified email address as the sender

3. **"Unauthorized"**
   - Check that your API key has "Mail Send" permissions
   - Ensure the API key is correctly copied (no extra spaces)

## 9. Testing Checklist

- [ ] Add SendGrid API key to `.env`
- [ ] Restart development server
- [ ] Complete sender verification in SendGrid
- [ ] Go to Email Settings page
- [ ] Enter sender email and name
- [ ] Click "Send Test Email"
- [ ] Check inbox for test email

## Support

For SendGrid documentation: https://docs.sendgrid.com/
For API reference: https://docs.sendgrid.com/api-reference/mail-send/mail-send