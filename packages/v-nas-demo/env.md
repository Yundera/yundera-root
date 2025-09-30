# Environment Configuration

This document describes the environment variables required for the V-NAS Demo service.

## Required Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# PCS Orchestrator Configuration
VNAS_BACKEND=https://app.yundera.com/service/pcs
VNAS_SERVICE_API_KEY=your-api-key-here

# Demo Instance Configuration  
DEMO_UID=your-demo-user-id-here

# SendGrid Email Configuration
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDMAIL_FROM_EMAIL=admin@yundera.com
```

## Variable Details

### `VNAS_BACKEND`
- **Description**: Base URL for the PCS orchestrator API endpoint
- **Required**: Yes
- **Format**: Full HTTPS URL
- **Options**:
  - Production: `https://app.yundera.com/service/pcs`
  - Alternative: `https://nasselle.com/service/pcs`
- **Example**: `VNAS_BACKEND=https://app.yundera.com/service/pcs`

### `VNAS_SERVICE_API_KEY`
- **Description**: Authentication key for accessing the PCS orchestrator API
- **Required**: Yes
- **Format**: Alphanumeric string
- **Security**: Keep this key secure and never commit it to version control
- **Usage**: Used in Bearer token authentication: `Bearer {API_KEY};{DEMO_UID}`

### `DEMO_UID`
- **Description**: Unique identifier for the demo user account
- **Required**: Yes
- **Format**: Alphanumeric string (typically starts with letters followed by mixed characters)
- **Purpose**: Identifies which user account to manage for demo instances
- **Example Format**: `nzEHabc123xyz789`

### `SENDGRID_API_KEY`
- **Description**: API key for SendGrid email service integration
- **Required**: Yes
- **Format**: Starts with `SG.` followed by the key
- **Purpose**: Enables email notifications for demo cleanup operations
- **Setup**: Obtain from SendGrid dashboard under Settings > API Keys

### `SENDMAIL_FROM_EMAIL`
- **Description**: Email address used as sender for notification emails
- **Required**: Yes
- **Format**: Valid email address
- **Purpose**: Appears as the "from" address in cleanup status emails
- **Recommendation**: Use a monitored admin or no-reply email address

## Setup Instructions

1. **Copy the template above** into a new `.env` file
2. **Replace all placeholder values** with your actual credentials
3. **Verify API access** by testing the VNAS_BACKEND endpoint
4. **Test email delivery** using the SendGrid configuration
5. **Ensure proper permissions** for the DEMO_UID account

## Security Notes

- ⚠️ **Never commit `.env` files** to version control
- ⚠️ **Restrict API key access** to necessary services only
- ⚠️ **Monitor email sending** to prevent spam/abuse
- ⚠️ **Rotate keys periodically** for security best practices
- ⚠️ **Use environment-specific values** for different deployment stages

## Troubleshooting

### Common Issues

**Authentication Errors (401/403)**
- Verify `VNAS_SERVICE_API_KEY` is correct and active
- Check `DEMO_UID` exists and has proper permissions
- Ensure API key has PCS management permissions

**Email Delivery Failures**
- Confirm `SENDGRID_API_KEY` is valid and active
- Verify sender email is authorized in SendGrid
- Check SendGrid account limits and quotas

**Connection Errors**
- Validate `VNAS_BACKEND` URL is accessible
- Test network connectivity to the API endpoint
- Check for firewall or proxy restrictions

## Validation Script

You can validate your environment configuration with:

```bash
# Check if all required variables are set
node -e "
const required = ['VNAS_BACKEND', 'VNAS_SERVICE_API_KEY', 'DEMO_UID', 'SENDGRID_API_KEY', 'SENDMAIL_FROM_EMAIL'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(\`❌ Missing: \${key}\`);
  } else {
    console.log(\`✅ Set: \${key}\`);
  }
});
"
```