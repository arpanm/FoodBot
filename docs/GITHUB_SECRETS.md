# GitHub Secrets Configuration

This document lists all the GitHub Secrets required for the CI/CD pipeline.

## Required Secrets

### AWS Configuration

| Secret Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIAIOSFODNN7EXAMPLE` | ✅ Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | ✅ Yes |
| `AWS_REGION` | AWS region for deployment | `us-east-1` | ✅ Yes |
| `S3_DEPLOYMENT_BUCKET` | S3 bucket for deployment packages | `foodbot-deployments` | Optional |

### EC2 Configuration

| Secret Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `EC2_HOST` | EC2 instance public IP or hostname | `3.234.123.45` or `ec2-xxx.compute.amazonaws.com` | ✅ Yes |
| `EC2_USER` | SSH username | `ubuntu` | ✅ Yes |
| `SSH_PRIVATE_KEY` | Private SSH key for EC2 access | `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAA...` | ✅ Yes |

### Application Configuration

| Secret Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `PRODUCTION_DOMAIN` | Production domain name | `foodbot.com` | ✅ Yes |
| `REACT_APP_API_URL` | API URL for frontend | `https://foodbot.com/api` | ✅ Yes |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Generated secure random string | ✅ Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Generated secure random string | ✅ Yes |

### External Services (Optional)

| Secret Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `CODECOV_TOKEN` | Codecov upload token | `abc123def456` | Optional |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/services/...` | Optional |
| `SNYK_TOKEN` | Snyk security scan token | `abc-def-ghi-jkl` | Optional |

## How to Add Secrets

### Via GitHub Web Interface

1. Navigate to your repository on GitHub
2. Click on **Settings**
3. Click on **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name and value
6. Click **Add secret**

### Via GitHub CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or
sudo apt install gh  # Ubuntu

# Authenticate
gh auth login

# Add secrets
gh secret set AWS_ACCESS_KEY_ID --body "your-access-key"
gh secret set AWS_SECRET_ACCESS_KEY --body "your-secret-key"
gh secret set EC2_HOST --body "your-ec2-ip"
# ... etc
```

## Generating Secure Secrets

### Generate JWT Secrets

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Generate SSH Key Pair

```bash
# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions@foodbot.com" -f ~/.ssh/foodbot-deploy

# Copy public key to EC2
ssh-copy-id -i ~/.ssh/foodbot-deploy.pub ubuntu@<EC2_IP>

# Get private key content for GitHub secret
cat ~/.ssh/foodbot-deploy
# Copy entire output including BEGIN and END lines
```

## Secret Value Examples

### AWS_ACCESS_KEY_ID
```
AKIAIOSFODNN7EXAMPLE
```

### AWS_SECRET_ACCESS_KEY
```
wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### SSH_PRIVATE_KEY
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL
MNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN
... (multiple lines) ...
OPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz==
-----END RSA PRIVATE KEY-----
```

**Important**: Include the BEGIN and END lines, and preserve line breaks.

### JWT_SECRET
```
kF9xH2vR8qP3mL7wN5tY1uE4aS6dZ0oI9jK8lM3nB2vC
```

## Environment-Specific Secrets

### Production Environment

Create a GitHub Environment named "production":
1. Go to Settings → Environments
2. Click **New environment**
3. Name it "production"
4. Add environment-specific secrets here

### Staging Environment

Repeat for "staging" environment with different values.

## Security Best Practices

### Do's ✅

- Use strong, randomly generated secrets
- Rotate secrets regularly (every 90 days)
- Use separate secrets for each environment
- Store secrets in GitHub Secrets (never commit to repo)
- Use minimum required IAM permissions
- Enable MFA on AWS account

### Don'ts ❌

- Never commit secrets to Git
- Never log secret values
- Never share secrets via email/chat
- Never use default/weak passwords
- Never reuse secrets across environments

## Verifying Secrets

### Test AWS Credentials Locally

```bash
# Configure AWS CLI
aws configure set aws_access_key_id YOUR_KEY
aws configure set aws_secret_access_key YOUR_SECRET
aws configure set region us-east-1

# Test S3 access
aws s3 ls s3://your-deployment-bucket/

# Test EC2 access
aws ec2 describe-instances --region us-east-1
```

### Test SSH Access

```bash
# Test SSH connection
ssh -i ~/.ssh/foodbot-deploy ubuntu@<EC2_IP>

# Verify key permissions
chmod 600 ~/.ssh/foodbot-deploy
```

### Test JWT Secrets

```bash
# Verify JWT secret length (should be 32+ characters)
echo -n "your-jwt-secret" | wc -c
```

## Troubleshooting

### "Invalid AWS credentials"
- Verify ACCESS_KEY_ID and SECRET_ACCESS_KEY are correct
- Check IAM user has required permissions
- Ensure secrets have no leading/trailing spaces

### "Permission denied (publickey)"
- Verify SSH private key is complete (including BEGIN/END lines)
- Check EC2 instance has the public key in `~/.ssh/authorized_keys`
- Ensure correct EC2_USER (usually 'ubuntu' or 'ec2-user')

### "Secret not found in workflow"
- Verify secret name matches exactly (case-sensitive)
- Check secret is added at repository level, not organization
- Ensure secret is not empty

## Rotation Schedule

| Secret Type | Rotation Frequency | Next Rotation |
|-------------|-------------------|---------------|
| AWS Keys | Every 90 days | Track manually |
| SSH Keys | Every 180 days | Track manually |
| JWT Secrets | Every 90 days | Track manually |
| Application Secrets | Every 90 days | Track manually |

## References

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [SSH Key Management](https://www.ssh.com/academy/ssh/keygen)
