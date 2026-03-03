# Certificate System Setup Guide

## Overview
The new certificate system generates beautiful HTML certificates with editable templates stored in the database and sends them via email using Resend.

## Features
- 3 professional certificate templates (Participation, Winner, Special Recognition)
- **Editable HTML templates** with live preview
- HTML-based certificates with GDG branding
- Automatic email delivery via Resend
- Preview functionality before sending
- Custom achievement text
- Template variables: {{RECIPIENT_NAME}}, {{EVENT_TITLE}}, {{DATE}}, {{ADDITIONAL_INFO}}

## Setup Instructions

### 1. Apply Database Migration

The certificate templates are stored in the database. The migration has been applied with default templates.

```bash
npx supabase db push
```

### 2. Deploy the Edge Function

```bash
npx supabase functions deploy send-certificate
```

### 3. Set up Resend API Key

1. Go to [Resend](https://resend.com) and create an account
2. Get your API key from the dashboard
3. Add the API key to Supabase secrets:

```bash
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 4. Verify Domain (Important!)

For production use, you need to verify your domain `gdgpsu.dev` in Resend:

1. Go to Resend Dashboard → Domains
2. Add domain: `gdgpsu.dev`
3. Add the DNS records provided by Resend to your domain
4. Wait for verification (usually takes a few minutes)

### 5. Test the System

1. Go to Admin Panel → Certificates tab
2. Click "Edit Template" on any certificate card to customize the HTML
3. Use the live preview to see changes in real-time
4. Save your customized template
5. Click "Generate Certificate" to send certificates

## Editing Certificate Templates

### Template Editor Features
- **HTML Editor Tab**: Edit the raw HTML code with syntax highlighting
- **Live Preview Tab**: See real-time preview with sample data
- **Variable System**: Use template variables that get replaced automatically
- **Conditional Blocks**: Show/hide content based on whether additional info exists

### Available Variables
- `{{RECIPIENT_NAME}}` - Recipient's full name
- `{{EVENT_TITLE}}` - Event title
- `{{DATE}}` - Certificate date (formatted)
- `{{ADDITIONAL_INFO}}` - Custom achievement text

### Conditional Blocks
- `{{#ADDITIONAL_INFO}}...{{/ADDITIONAL_INFO}}` - Show content only if additional info exists
- `{{^ADDITIONAL_INFO}}...{{/ADDITIONAL_INFO}}` - Show content only if additional info doesn't exist

### Example Usage
```html
<div class="description">
  for outstanding performance in <span>{{EVENT_TITLE}}</span><br>
  {{#ADDITIONAL_INFO}}{{ADDITIONAL_INFO}}{{/ADDITIONAL_INFO}}
  {{^ADDITIONAL_INFO}}demonstrating exceptional skills{{/ADDITIONAL_INFO}}
</div>
```

## Certificate Templates

### Participation Certificate
- **Theme**: Dark blue with GDG branding
- **Use**: All participants who completed the event
- **Icon**: 🎓
- **Editable**: Yes, click "Edit Template" button

### Winner Certificate
- **Theme**: Gold with trophy
- **Use**: Top performers and challenge winners
- **Icon**: 🏆
- **Editable**: Yes, click "Edit Template" button

### Special Recognition
- **Theme**: Gradient with star
- **Use**: Outstanding contributions and special achievements
- **Icon**: ⭐
- **Editable**: Yes, click "Edit Template" button

## Email Configuration

The system sends emails from: `GDG Penn State <team@gdgpsu.dev>`

Email includes:
- Congratulations message
- Certificate attached as HTML file
- Instructions for downloading and sharing
- GDG branding

## Troubleshooting

### Email not sending
- Check Resend API key is set correctly
- Verify domain is verified in Resend
- Check Supabase Edge Function logs

### Certificate not generating
- Check browser console for errors
- Verify user data is complete
- Test preview functionality first

### Preview not working
- Check popup blocker settings
- Try in incognito mode
- Verify browser supports window.open()

### Template editor not saving
- Check you have admin/owner role
- Verify database connection
- Check browser console for errors

## Development vs Production

### Development (Testing)
- Use Resend sandbox mode
- Emails only sent to verified addresses
- No domain verification needed

### Production
- Domain must be verified
- Can send to any email address
- Higher sending limits

## Next Steps

1. Deploy the Edge Function
2. Set up Resend API key
3. Verify domain (for production)
4. Customize certificate templates using the editor
5. Test with a few users
6. Send certificates to all participants!
