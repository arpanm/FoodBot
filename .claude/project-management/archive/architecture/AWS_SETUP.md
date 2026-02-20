# AWS Setup Guide for FoodBot Deployment

This guide covers setting up AWS infrastructure for deploying the FoodBot application.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- SSH key pair for EC2 access
- Domain name (optional, for production)

## 1. EC2 Instance Setup

### 1.1 Launch EC2 Instance

**Recommended Specifications:**
- **Instance Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **AMI**: Ubuntu 22.04 LTS
- **Storage**: 30GB SSD minimum
- **Region**: Choose based on your target audience

### 1.2 Security Group Configuration

Create a security group with these inbound rules:

```
Type            Port    Source          Description
SSH             22      Your IP         SSH access
HTTP            80      0.0.0.0/0       HTTP traffic
HTTPS           443     0.0.0.0/0       HTTPS traffic
Custom TCP      5433    10.0.0.0/16     PostgreSQL (internal only)
Custom TCP      6379    10.0.0.0/16     Redis (internal only)
```

Outbound rules:
```
All traffic     All     0.0.0.0/0       Allow all outbound
```

### 1.3 Allocate Elastic IP

1. Navigate to EC2 → Elastic IPs
2. Click "Allocate Elastic IP address"
3. Associate it with your EC2 instance

## 2. Server Setup

### 2.1 Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<ELASTIC_IP>
```

### 2.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be v20.x
```

### 2.4 Install Java (for MCP Service)

```bash
sudo apt install -y openjdk-17-jdk
java -version  # Should be 17.x
```

### 2.5 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE foodbot;
CREATE USER foodbot_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE foodbot TO foodbot_user;
\q
