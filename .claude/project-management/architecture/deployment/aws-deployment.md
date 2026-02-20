# AWS Deployment Guide - FoodBot

**Version:** 1.0.0
**Status:** Production-Ready
**Last Updated:** 2026-02-20

---

## Quick Reference

### AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **EKS** | Kubernetes cluster | v1.27+, 12 nodes |
| **RDS PostgreSQL** | Application database | db.r6g.2xlarge, Multi-AZ |
| **ElastiCache Redis** | Cache & sessions | cache.r7g.xlarge, 3 nodes |
| **OpenSearch** | Search engine | r6g.xlarge.search, 3+3 nodes |
| **MSK** | Event streaming | kafka.m5.2xlarge, 6 brokers |
| **ALB** | Load balancing | Application Load Balancer |
| **S3** | Backups & static assets | 3 buckets |
| **CloudFront** | CDN | Global distribution |
| **Route 53** | DNS management | Hosted zones |
| **ACM** | SSL/TLS certificates | Auto-renewal |
| **Secrets Manager** | Secret storage | Encrypted with KMS |
| **CloudWatch** | Monitoring & logging | Metrics & logs |

### Total Monthly Cost Estimate

| Component | Specification | Monthly Cost (USD) |
|-----------|--------------|-------------------|
| EKS Cluster | 1 cluster | $73 |
| EC2 Nodes (App) | 6 x c5.4xlarge | $1,456 |
| EC2 Nodes (Data) | 6 x r5.2xlarge | $1,814 |
| RDS PostgreSQL (App) | db.r6g.2xlarge Multi-AZ | $946 |
| RDS PostgreSQL (Temporal) | db.r6g.xlarge Multi-AZ | $473 |
| ElastiCache Redis | cache.r7g.xlarge x3 | $775 |
| OpenSearch | r6g.xlarge.search x6 | $1,277 |
| MSK | kafka.m5.2xlarge x6 | $2,073 |
| ALB | 1 load balancer | $25 |
| S3 | 1TB storage + requests | $50 |
| CloudFront | 1TB data transfer | $85 |
| Data Transfer | Inter-service & internet | $200 |
| **Total** | | **~$9,247/month** |

**Cost Optimization Potential:**
- Reserved Instances (3-year): Save ~60% = **~$5,500/month**
- Spot Instances (30% workload): Additional ~$500/month savings
- **Optimized Total: ~$5,000-5,500/month**

---

## Architecture Diagram

```
                      ┌────────────────────────┐
                      │     Route 53 (DNS)     │
                      └────────────┬───────────┘
                                   │
                      ┌────────────▼───────────┐
                      │   CloudFront (CDN)     │
                      │   - Static assets      │
                      └────────────┬───────────┘
                                   │
                      ┌────────────▼───────────┐
                      │      ACM (SSL/TLS)     │
                      └────────────┬───────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼────────┐  ┌────────▼────────┐  ┌──────▼──────┐
    │   ALB (Public)   │  │  ALB (Internal) │  │  WAF (DDoS) │
    └─────────┬────────┘  └────────┬────────┘  └─────────────┘
              │                    │
    ┌─────────▼────────────────────▼─────────┐
    │           EKS Cluster                   │
    │  ┌──────────┐  ┌───────────┐           │
    │  │ Frontend │  │  Gateway  │           │
    │  │   Pods   │  │  API Pods │           │
    │  └──────────┘  └─────┬─────┘           │
    │                      │                  │
    └──────────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┬──────────────┐
        │                  │                  │              │
   ┌────▼─────┐    ┌──────▼─────┐    ┌──────▼──────┐  ┌────▼────┐
   │   RDS    │    │ ElastiCache│    │  OpenSearch │  │   MSK   │
   │PostgreSQL│    │   Redis    │    │             │  │  Kafka  │
   └──────────┘    └────────────┘    └─────────────┘  └─────────┘
                                               │
                                      ┌────────▼────────┐
                                      │  S3 (Backups &  │
                                      │  Static Assets) │
                                      └─────────────────┘
```

---

## 1. AWS Account Setup

### 1.1 Create AWS Account & IAM Users

```bash
# Create admin user for initial setup
aws iam create-user --user-name foodbot-admin

# Attach admin policy
aws iam attach-user-policy \
  --user-name foodbot-admin \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access key
aws iam create-access-key --user-name foodbot-admin

# Configure AWS CLI
aws configure --profile foodbot
```

### 1.2 Enable Required Services

```bash
# Enable services
aws service-quotas list-services

# Request quota increases if needed
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --desired-value 50  # Increase vCPU limit
```

---

## 2. VPC & Networking Setup

### 2.1 Create VPC

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=foodbot-vpc}]'

VPC_ID=<vpc-id-from-output>

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames
```

### 2.2 Create Subnets (Multi-AZ)

```bash
# Public Subnet - AZ1
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=foodbot-public-1a}]'

# Public Subnet - AZ2
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=foodbot-public-1b}]'

# Public Subnet - AZ3
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.3.0/24 \
  --availability-zone us-east-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=foodbot-public-1c}]'

# Private Subnet - AZ1
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=foodbot-private-1a}]'

# Private Subnet - AZ2
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=foodbot-private-1b}]'

# Private Subnet - AZ3
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.13.0/24 \
  --availability-zone us-east-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=foodbot-private-1c}]'
```

### 2.3 Internet Gateway & NAT Gateways

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=foodbot-igw}]'

IGW_ID=<igw-id>

# Attach to VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Allocate Elastic IPs for NAT Gateways
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=foodbot-nat-eip-1a}]'
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=foodbot-nat-eip-1b}]'
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=foodbot-nat-eip-1c}]'

# Create NAT Gateways (one per AZ)
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-1a-id> \
  --allocation-id <eip-1a-id> \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=foodbot-nat-1a}]'
```

### 2.4 Route Tables

```bash
# Public Route Table
aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=foodbot-public-rt jamón}]'

PUBLIC_RT_ID=<public-rt-id>

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate public subnets
aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id <public-subnet-1a-id>
aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id <public-subnet-1b-id>
aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id <public-subnet-1c-id>

# Private Route Tables (one per AZ with NAT Gateway)
# Similar for each AZ...
```

---

## 3. EKS Cluster Setup

### 3.1 Create EKS Cluster

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster configuration
cat > eks-cluster.yaml <<YAML
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: foodbot-prod
  region: us-east-1
  version: "1.27"

vpc:
  id: $VPC_ID
  subnets:
    private:
      us-east-1a: { id: <private-subnet-1a-id> }
      us-east-1b: { id: <private-subnet-1b-id> }
      us-east-1c: { id: <private-subnet-1c-id> }

managedNodeGroups:
  - name: app-nodes
    instanceType: c5.4xlarge
    minSize: 3
    maxSize: 20
    desiredCapacity: 6
    volumeSize: 100
    ssh:
      allow: true
      publicKeyName: foodbot-ec2-key
    labels:
      workload-type: application
    tags:
      Environment: production
      Application: foodbot
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true
        ebs: true

  - name: data-nodes
    instanceType: r5.2xlarge
    minSize: 3
    maxSize: 10
    desiredCapacity: 6
    volumeSize: 200
    ssh:
      allow: true
      publicKeyName: foodbot-ec2-key
    labels:
      workload-type: database
    tags:
      Environment: production
      Application: foodbot

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver

cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
YAML

# Create cluster (takes ~20 minutes)
eksctl create cluster -f eks-cluster.yaml
```

### 3.2 Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name foodbot-prod

# Verify connection
kubectl get nodes
```

### 3.3 Install Cluster Add-ons

```bash
# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller/crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=foodbot-prod

# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install Cluster Autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
```

---

## 4. RDS PostgreSQL Setup

### 4.1 Create DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name foodbot-db-subnet-group \
  --db-subnet-group-description "FoodBot database subnet group" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id> <private-subnet-1c-id> \
  --tags Key=Application,Value=foodbot
```

### 4.2 Create Security Group

```bash
aws ec2 create-security-group \
  --group-name foodbot-rds-sg \
  --description "Security group for FoodBot RDS" \
  --vpc-id $VPC_ID

RDS_SG_ID=<sg-id>

# Allow PostgreSQL from EKS nodes
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group <eks-node-sg-id>
```

### 4.3 Create RDS Instance

```bash
# Generate strong password
DB_PASSWORD=$(openssl rand -base64 32)

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier foodbot-postgres-prod \
  --db-instance-class db.r6g.2xlarge \
  --engine postgres \
  --engine-version 16.1 \
  --master-username foodbot_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 500 \
  --storage-type gp3 \
  --storage-encrypted \
  --iops 12000 \
  --storage-throughput 500 \
  --multi-az \
  --db-subnet-group-name foodbot-db-subnet-group \
  --vpc-security-group-ids $RDS_SG_ID \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --enable-cloudwatch-logs-exports postgresql \
  --deletion-protection \
  --tags Key=Environment,Value=production Key=Application,Value=foodbot

# Wait for creation (takes ~15 minutes)
aws rds wait db-instance-available --db-instance-identifier foodbot-postgres-prod

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier foodbot-postgres-prod \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### 4.4 Store Credentials in Secrets Manager

```bash
aws secretsmanager create-secret \
  --name foodbot/postgres/credentials \
  --description "FoodBot PostgreSQL credentials" \
  --secret-string "{\"username\":\"foodbot_admin\",\"password\":\"$DB_PASSWORD\",\"host\":\"<rds-endpoint>\",\"port\":\"5432\",\"database\":\"foodbot\"}"
```

---

## 5. Additional Services Setup

### 5.1 ElastiCache Redis

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name foodbot-redis-subnet-group \
  --cache-subnet-group-description "FoodBot Redis subnet group" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id> <private-subnet-1c-id>

# Create security group
aws ec2 create-security-group \
  --group-name foodbot-redis-sg \
  --description "Security group for FoodBot Redis" \
  --vpc-id $VPC_ID

REDIS_SG_ID=<sg-id>

# Allow Redis from EKS
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group <eks-node-sg-id>

# Create Redis cluster
REDIS_AUTH_TOKEN=$(openssl rand -base64 32 | tr -d '/+=')

aws elasticache create-replication-group \
  --replication-group-id foodbot-redis-prod \
  --replication-group-description "FoodBot production Redis" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r7g.xlarge \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name foodbot-redis-subnet-group \
  --security-group-ids $REDIS_SG_ID \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "$REDIS_AUTH_TOKEN" \
  --snapshot-retention-limit 7 \
  --snapshot-window "02:00-03:00" \
  --tags Key=Environment,Value=production Key=Application,Value=foodbot
```

### 5.2 OpenSearch (Elasticsearch)

```bash
# Create OpenSearch domain
aws opensearch create-domain \
  --domain-name foodbot-search-prod \
  --engine-version OpenSearch_2.11 \
  --cluster-config InstanceType=r6g.xlarge.search,InstanceCount=3,DedicatedMasterEnabled=true,DedicatedMasterType=r6g.large.search,DedicatedMasterCount=3,ZoneAwarenessEnabled=true,ZoneAwarenessConfig={AvailabilityZoneCount=3} \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=500,Iops=12000,Throughput=500 \
  --vpc-options SubnetIds=<private-subnet-ids>,SecurityGroupIds=<opensearch-sg-id> \
  --encryption-at-rest-options Enabled=true \
  --node-to-node-encryption-options Enabled=true \
  --domain-endpoint-options EnforceHTTPS=true,TLSSecurityPolicy=Policy-Min-TLS-1-2-2019-07 \
  --snapshot-options AutomatedSnapshotStartHour=1 \
  --tags Key=Environment,Value=production Key=Application,Value=foodbot
```

### 5.3 MSK (Kafka)

```bash
# Create MSK cluster
aws kafka create-cluster-v2 \
  --cluster-name foodbot-kafka-prod \
  --kafka-version 3.5.1 \
  --provisioned Provisioned={BrokerNodeGroupInfo={InstanceType=kafka.m5.2xlarge,ClientSubnets=[<private-subnet-ids>],SecurityGroups=[<msk-sg-id>],StorageInfo={EbsStorageInfo={VolumeSize=1000,ProvisionedThroughput={Enabled=true,VolumeThroughput=250}}}},NumberOfBrokerNodes=6,EncryptionInfo={EncryptionAtRest={DataVolumeKMSKeyId=<kms-key-id>},EncryptionInTransit={ClientBroker=TLS,InCluster=true}}} \
  --tags Environment=production,Application=foodbot
```

---

## 6. Application Deployment

See main deployment guide at:
`/Users/arpan1.mukherjee/code/FoodBot/.claude/project-management/architecture/deployment/deployment-architecture.md`

---

## 7. Monitoring & Logging

### 7.1 CloudWatch Dashboards

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name FoodBot-Production \
  --dashboard-body file://cloudwatch-dashboard.json
```

### 7.2 CloudWatch Alarms

```bash
# High CPU Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name foodbot-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EKS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## 8. Backup & Disaster Recovery

### 8.1 RDS Automated Backups

- Retention: 30 days
- Backup window: 03:00-04:00 UTC
- Point-in-time recovery enabled

### 8.2 EBS Snapshots

```bash
# Create lifecycle policy for EBS snapshots
aws dlm create-lifecycle-policy \
  --description "Daily EBS snapshots for FoodBot" \
  --state ENABLED \
  --execution-role-arn <dlm-role-arn> \
  --policy-details file://snapshot-policy.json
```

### 8.3 S3 Backup Strategy

```bash
# Create backup bucket
aws s3 mb s3://foodbot-backups-prod --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket foodbot-backups-prod \
  --versioning-configuration Status=Enabled

# Configure lifecycle
aws s3api put-bucket-lifecycle-configuration \
  --bucket foodbot-backups-prod \
  --lifecycle-configuration file://s3-lifecycle.json
```

---

## 9. Security Hardening

### 9.1 Enable AWS Security Services

```bash
# Enable GuardDuty
aws guardduty create-detector --enable

# Enable Security Hub
aws securityhub enable-security-hub

# Enable AWS Config
aws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=<config-role-arn>
```

### 9.2 IAM Roles & Policies

See detailed IAM configuration in security documentation.

---

## 10. Cost Management

### 10.1 Cost Allocation Tags

```bash
# Activate cost allocation tags
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status \
  '[{"TagKey":"Environment","Status":"Active"},{"TagKey":"Application","Status":"Active"}]'
```

### 10.2 Budget Alerts

```bash
# Create monthly budget
aws budgets create-budget \
  --account-id <account-id> \
  --budget file://monthly-budget.json \
  --notifications-with-subscribers file://budget-notifications.json
```

---

**Document Owner:** DevOps & Cloud Architecture Team
**Review Schedule:** Quarterly
**Next Review Date:** 2026-05-20
