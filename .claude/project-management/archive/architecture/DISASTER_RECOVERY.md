# FoodBot Disaster Recovery Plan

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Status:** Active
**Owner:** SRE Team

---

## Table of Contents

- [1. Recovery Objectives](#1-recovery-objectives)
- [2. Backup Procedures](#2-backup-procedures)
- [3. Recovery Procedures](#3-recovery-procedures)
- [4. Failover Procedures](#4-failover-procedures)
- [5. Data Loss Scenarios](#5-data-loss-scenarios)
- [6. DR Testing Schedule](#6-dr-testing-schedule)

---

## 1. Recovery Objectives

### RTO/RPO Targets

| Component | RPO (Data Loss) | RTO (Downtime) | Backup Frequency | Retention |
|-----------|-----------------|----------------|------------------|-----------|
| **PostgreSQL (App)** | 1 hour | 15 minutes | Continuous (WAL) + Daily Snapshot | 30 days |
| **PostgreSQL (Temporal)** | 1 hour | 15 minutes | Continuous (WAL) + Daily Snapshot | 30 days |
| **Redis** | 1 second | 5 minutes | AOF (every second) + Daily RDB | 7 days |
| **Elasticsearch** | 24 hours | 30 minutes | Daily Snapshot | 30 days |
| **Kafka** | 0 (replicated) | 5 minutes | Topic Retention (7-90 days) | N/A |
| **Application Code** | 0 (Git) | 10 minutes | Git commits | Infinite |
| **Secrets** | N/A | 5 minutes | Encrypted backups | Infinite |

### Business Impact

| Downtime | Impact | Revenue Loss | Customer Impact |
|----------|--------|--------------|-----------------|
| **< 15 min** | Minimal | $500 | Few customer complaints |
| **15-60 min** | Moderate | $5,000 | Customer complaints, social media posts |
| **1-4 hours** | High | $25,000 | Significant customer churn, negative reviews |
| **> 4 hours** | Critical | $100,000+ | Major customer churn, brand damage, potential lawsuits |

### Service Priority

| Priority | Services | Recovery Time Target |
|----------|----------|---------------------|
| **P0 - Critical** | Gateway API, PostgreSQL, Temporal Server | 15 minutes |
| **P1 - High** | MCP Orchestrator, Redis, Elasticsearch, Kafka | 30 minutes |
| **P2 - Medium** | Temporal Workers, Notification Service | 1 hour |
| **P3 - Low** | Monitoring, Logging, Management UIs | 4 hours |

---

## 2. Backup Procedures

### PostgreSQL Backups

#### Continuous Archiving (WAL)

**Setup:**
```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://foodbot-backups/postgres-wal/%f'
archive_timeout = 300  # Force WAL switch every 5 minutes
```

**Verification:**
```bash
# Check WAL archiving status
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -c "SELECT * FROM pg_stat_archiver;"

# List recent WAL files in S3
aws s3 ls s3://foodbot-backups/postgres-wal/ --recursive | tail -20
```

#### Daily Full Backup

**Automated CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: foodbot-data
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - sh
            - -c
            - |
              set -e
              BACKUP_FILE="foodbot_$(date +%Y%m%d_%H%M%S).sql.gz"

              # Create backup
              pg_dump -h postgres-app -U postgres -d foodbot -Fc | gzip > /tmp/$BACKUP_FILE

              # Upload to S3
              aws s3 cp /tmp/$BACKUP_FILE s3://foodbot-backups/postgres-daily/$BACKUP_FILE

              # Verify backup
              gunzip -t /tmp/$BACKUP_FILE

              # Delete local file
              rm /tmp/$BACKUP_FILE

              # Delete old backups (keep 30 days)
              aws s3 ls s3://foodbot-backups/postgres-daily/ | \
                awk '{print $4}' | \
                head -n -30 | \
                xargs -I {} aws s3 rm s3://foodbot-backups/postgres-daily/{}

              echo "Backup completed: $BACKUP_FILE"
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access_key_id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret_access_key
          restartPolicy: OnFailure
```

**Manual Backup:**
```bash
# Create manual backup
BACKUP_FILE="foodbot_manual_$(date +%Y%m%d_%H%M%S).sql.gz"
kubectl exec -n foodbot-data sts/postgres-app -- pg_dump -U postgres -d foodbot -Fc | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://foodbot-backups/postgres-manual/$BACKUP_FILE

# Verify backup integrity
gunzip -t $BACKUP_FILE && echo "Backup valid"
```

### Redis Backups

#### AOF (Append-Only File)

**Configuration:**
```bash
# redis.conf
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**Manual AOF Rewrite:**
```bash
kubectl exec -n foodbot-data sts/redis-0 -- redis-cli BGREWRITEAOF
```

#### RDB Snapshots

**Automated Daily Snapshot:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
  namespace: foodbot-data
spec:
  schedule: "0 3 * * *"  # 3 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: redis:7-alpine
            command:
            - sh
            - -c
            - |
              # Trigger BGSAVE
              redis-cli -h redis-0 BGSAVE

              # Wait for save to complete
              while [ $(redis-cli -h redis-0 LASTSAVE) -eq $(date +%s) ]; do
                sleep 1
              done

              # Copy RDB file
              kubectl cp foodbot-data/redis-0:/data/dump.rdb /tmp/redis_backup_$(date +%Y%m%d).rdb

              # Upload to S3
              aws s3 cp /tmp/redis_backup_$(date +%Y%m%d).rdb s3://foodbot-backups/redis/
          restartPolicy: OnFailure
```

### Elasticsearch Backups

#### S3 Snapshot Repository

**Setup:**
```bash
# Create snapshot repository
curl -X PUT "https://elasticsearch.foodbot.com/_snapshot/s3_backup" -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "foodbot-backups",
    "region": "us-east-1",
    "base_path": "elasticsearch",
    "compress": true,
    "max_restore_bytes_per_sec": "100mb",
    "max_snapshot_bytes_per_sec": "100mb"
  }
}'
```

#### Automated Snapshot Policy

```bash
# Create snapshot lifecycle policy
curl -X PUT "https://elasticsearch.foodbot.com/_slm/policy/daily-snapshots" -H 'Content-Type: application/json' -d'
{
  "schedule": "0 30 1 * * ?",
  "name": "<daily-snap-{now/d}>",
  "repository": "s3_backup",
  "config": {
    "indices": ["foodbot_*"],
    "ignore_unavailable": false,
    "include_global_state": false,
    "metadata": {
      "taken_by": "snapshot-lifecycle-policy",
      "taken_because": "daily backup"
    }
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 90
  }
}'

# Verify policy
curl -X GET "https://elasticsearch.foodbot.com/_slm/policy/daily-snapshots?pretty"
```

#### Manual Snapshot

```bash
# Create manual snapshot
SNAPSHOT_NAME="manual_$(date +%Y%m%d_%H%M%S)"
curl -X PUT "https://elasticsearch.foodbot.com/_snapshot/s3_backup/$SNAPSHOT_NAME?wait_for_completion=true" -H 'Content-Type: application/json' -d'
{
  "indices": "foodbot_*",
  "ignore_unavailable": false,
  "include_global_state": false,
  "metadata": {
    "taken_by": "admin",
    "taken_because": "pre-deployment backup"
  }
}'

# Verify snapshot
curl -X GET "https://elasticsearch.foodbot.com/_snapshot/s3_backup/$SNAPSHOT_NAME?pretty"
```

### Kafka Data Retention

**Topic Retention Configuration:**
```bash
# Increase retention for critical topics
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-configs \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name order.created \
  --alter --add-config retention.ms=7776000000  # 90 days

# Verify retention
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-configs \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name order.created \
  --describe
```

**Mirror Maker 2 (Cross-Region Replication):**
```yaml
# kafka-mirror-maker.yml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaMirrorMaker2
metadata:
  name: kafka-mirror
spec:
  version: 3.5.1
  replicas: 2
  connectCluster: "target"
  clusters:
    - alias: "source"
      bootstrapServers: kafka.us-east-1.foodbot.com:9092
    - alias: "target"
      bootstrapServers: kafka.us-west-2.foodbot.com:9092
  mirrors:
    - sourceCluster: "source"
      targetCluster: "target"
      sourceConnector:
        config:
          replication.factor: 3
          sync.topic.acls.enabled: "false"
      topicsPattern: ".*"
```

### Secrets Backup

**Backup Kubernetes Secrets:**
```bash
# Export all secrets
kubectl get secrets -n foodbot-apps -o yaml > secrets-apps-$(date +%Y%m%d).yaml
kubectl get secrets -n foodbot-services -o yaml > secrets-services-$(date +%Y%m%d).yaml
kubectl get secrets -n foodbot-data -o yaml > secrets-data-$(date +%Y%m%d).yaml

# Encrypt with GPG
gpg --encrypt --recipient ops@foodbot.com secrets-*.yaml

# Upload to S3
aws s3 cp secrets-*.yaml.gpg s3://foodbot-backups/secrets/

# Delete local files
rm secrets-*.yaml secrets-*.yaml.gpg
```

---

## 3. Recovery Procedures

### PostgreSQL Recovery

#### Point-in-Time Recovery (PITR)

**Scenario:** Database corruption at 10:30 AM, need to restore to 10:25 AM.

**Steps:**
1. Stop application pods (prevent writes during recovery)
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=0
kubectl scale -n foodbot-workflows deployment/temporal-workers --replicas=0
```

2. Stop PostgreSQL pod
```bash
kubectl scale -n foodbot-data sts/postgres-app --replicas=0
```

3. Download base backup
```bash
# Find base backup before incident
aws s3 ls s3://foodbot-backups/postgres-daily/ | grep "$(date +%Y%m%d)"

# Download base backup
aws s3 cp s3://foodbot-backups/postgres-daily/foodbot_20260219_020000.sql.gz /tmp/base-backup.sql.gz
```

4. Restore base backup
```bash
# Delete existing data directory
kubectl exec -n foodbot-data sts/postgres-app-0 -- rm -rf /var/lib/postgresql/data/*

# Restore base backup
gunzip -c /tmp/base-backup.sql.gz | kubectl exec -i -n foodbot-data sts/postgres-app-0 -- psql -U postgres -d foodbot
```

5. Configure recovery
```bash
kubectl exec -n foodbot-data sts/postgres-app-0 -- bash -c "cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://foodbot-backups/postgres-wal/%f %p'
recovery_target_time = '2026-02-19 10:25:00'
recovery_target_action = 'promote'
EOF"
```

6. Start PostgreSQL and verify
```bash
kubectl scale -n foodbot-data sts/postgres-app --replicas=1

# Wait for recovery to complete
kubectl logs -n foodbot-data sts/postgres-app-0 -f | grep "recovery complete"

# Verify data
kubectl exec -n foodbot-data sts/postgres-app-0 -- psql -U postgres -d foodbot -c "SELECT count(*) FROM orders WHERE created_at <= '2026-02-19 10:25:00';"
```

7. Restart application pods
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=3
kubectl scale -n foodbot-workflows deployment/temporal-workers --replicas=2
```

**Duration:** ~15 minutes

#### Full Database Recovery

**Scenario:** Complete database loss, restore from latest backup.

**Steps:**
1. Download latest backup
```bash
LATEST_BACKUP=$(aws s3 ls s3://foodbot-backups/postgres-daily/ | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://foodbot-backups/postgres-daily/$LATEST_BACKUP /tmp/restore.sql.gz
```

2. Stop application and database
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=0
kubectl scale -n foodbot-data sts/postgres-app --replicas=0
```

3. Recreate database pod
```bash
kubectl delete pvc -n foodbot-data postgres-app-data-postgres-app-0
kubectl scale -n foodbot-data sts/postgres-app --replicas=1
```

4. Restore backup
```bash
gunzip -c /tmp/restore.sql.gz | kubectl exec -i -n foodbot-data sts/postgres-app-0 -- pg_restore -U postgres -d foodbot -v
```

5. Restart services
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=3
```

**Duration:** ~20 minutes

### Redis Recovery

#### AOF Recovery

**Scenario:** Redis pod crashed, need to recover from AOF.

**Steps:**
1. Check AOF file integrity
```bash
kubectl exec -n foodbot-data sts/redis-0 -- redis-check-aof /data/appendonly.aof
```

2. If corrupt, repair AOF
```bash
kubectl exec -n foodbot-data sts/redis-0 -- redis-check-aof --fix /data/appendonly.aof
```

3. Restart Redis
```bash
kubectl rollout restart -n foodbot-data sts/redis
```

**Duration:** ~2 minutes

#### RDB Recovery

**Scenario:** AOF corrupted beyond repair, restore from RDB snapshot.

**Steps:**
1. Download latest RDB backup
```bash
LATEST_RDB=$(aws s3 ls s3://foodbot-backups/redis/ | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://foodbot-backups/redis/$LATEST_RDB /tmp/dump.rdb
```

2. Stop Redis
```bash
kubectl scale -n foodbot-data sts/redis --replicas=0
```

3. Replace RDB file
```bash
kubectl cp /tmp/dump.rdb foodbot-data/redis-0:/data/dump.rdb
```

4. Start Redis
```bash
kubectl scale -n foodbot-data sts/redis --replicas=1
```

**Duration:** ~5 minutes

**Data Loss:** Up to 24 hours (since last RDB snapshot)

### Elasticsearch Recovery

#### Index Recovery from Snapshot

**Scenario:** Elasticsearch index corrupted or deleted.

**Steps:**
1. List available snapshots
```bash
curl -X GET "https://elasticsearch.foodbot.com/_snapshot/s3_backup/_all?pretty"
```

2. Close affected indices
```bash
curl -X POST "https://elasticsearch.foodbot.com/foodbot_restaurants/_close"
curl -X POST "https://elasticsearch.foodbot.com/foodbot_dishes/_close"
```

3. Restore from snapshot
```bash
SNAPSHOT_NAME="daily-snap-2026-02-19"
curl -X POST "https://elasticsearch.foodbot.com/_snapshot/s3_backup/$SNAPSHOT_NAME/_restore" -H 'Content-Type: application/json' -d'
{
  "indices": "foodbot_*",
  "ignore_unavailable": true,
  "include_global_state": false,
  "rename_pattern": "(.+)",
  "rename_replacement": "$1_restored",
  "include_aliases": false
}'
```

4. Monitor restore progress
```bash
curl -X GET "https://elasticsearch.foodbot.com/_recovery?human&pretty"
```

5. Reindex from Kafka (if needed)
```bash
# Trigger re-indexing from Kafka topic replay
kubectl exec -n foodbot-services deployment/mcp-orchestrator -- \
  curl -X POST http://localhost:8081/mcp/v1/admin/reindex-from-kafka
```

**Duration:** ~30 minutes (depends on index size)

### Kafka Recovery

#### Topic Recovery from Retention

**Scenario:** Consumer group offset corrupted, need to replay messages.

**Steps:**
1. Reset consumer group offset
```bash
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group notification-consumers \
  --topic order.status.changed \
  --reset-offsets --to-earliest --execute
```

2. Restart consumers
```bash
kubectl rollout restart -n foodbot-services deployment/notification-service
```

**Duration:** ~5 minutes + reprocessing time

#### Mirror Maker Failover

**Scenario:** Primary Kafka cluster down, failover to DR cluster.

**Steps:**
1. Update application configs to point to DR Kafka
```bash
kubectl set env -n foodbot-apps deployment/gateway-api \
  KAFKA_BROKERS=kafka.us-west-2.foodbot.com:9092

kubectl set env -n foodbot-services deployment/mcp-orchestrator \
  KAFKA_BOOTSTRAP_SERVERS=kafka.us-west-2.foodbot.com:9092
```

2. Restart all Kafka consumers/producers
```bash
kubectl rollout restart -n foodbot-apps deployment/gateway-api
kubectl rollout restart -n foodbot-services deployment/mcp-orchestrator
kubectl rollout restart -n foodbot-services deployment/notification-service
```

**Duration:** ~10 minutes

---

## 4. Failover Procedures

### Multi-Region Failover

**Architecture:**
```
Primary Region (us-east-1)           DR Region (us-west-2)
─────────────────────────            ────────────────────────
┌─────────────────────┐             ┌─────────────────────┐
│  Application Stack  │             │  Application Stack  │
│  (Active)           │             │  (Standby)          │
└──────────┬──────────┘             └──────────┬──────────┘
           │                                   │
┌──────────┴──────────┐             ┌──────────┴──────────┐
│  PostgreSQL         │────────────>│  PostgreSQL         │
│  (Primary)          │  Streaming  │  (Read Replica)     │
└─────────────────────┘  Replication└─────────────────────┘
```

#### DNS Failover

**Route 53 Health Check Configuration:**
```json
{
  "Type": "HTTPS",
  "ResourcePath": "/health",
  "FullyQualifiedDomainName": "api.foodbot.com",
  "Port": 443,
  "RequestInterval": 30,
  "FailureThreshold": 3
}
```

**Failover Steps:**

1. Detect primary region failure (automated via health checks)
```bash
# Health check failing for 3 consecutive attempts
```

2. Promote DR PostgreSQL to primary
```bash
# Connect to DR PostgreSQL
kubectl exec -n foodbot-data sts/postgres-app-0 -- psql -U postgres -d foodbot -c "SELECT pg_promote();"
```

3. Update Route 53 DNS to point to DR region (automated)
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890ABC --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.foodbot.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z0987654321XYZ",
        "DNSName": "api-dr.foodbot.com",
        "EvaluateTargetHealth": true
      }
    }
  }]
}'
```

4. Scale up DR application pods
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=10
kubectl scale -n foodbot-services deployment/mcp-orchestrator --replicas=5
```

5. Verify failover
```bash
# Check DNS propagation
dig api.foodbot.com

# Test API endpoint
curl https://api.foodbot.com/health

# Check error rate and latency
# (Should be normal within 5 minutes)
```

**Duration:** ~5 minutes (automated)

**Data Loss:** ~30 seconds (replication lag)

### Database Failover (PostgreSQL)

#### Automatic Failover with Patroni

**Setup:**
```yaml
# patroni-config.yml
scope: foodbot-postgres
bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB
postgresql:
  use_pg_rewind: true
  parameters:
    synchronous_commit: "on"
    synchronous_standby_names: "postgres-replica-1"
```

**Failover Process:**
1. Patroni detects primary failure (health check timeout)
2. Elects new primary from synchronous replica
3. Promotes replica to primary
4. Updates DNS/load balancer to new primary
5. Old primary becomes replica when it recovers

**Duration:** ~30 seconds (automated)

### Redis Sentinel Failover

**Setup:**
```yaml
# redis-sentinel-config
sentinel monitor foodbot-redis redis-0 6379 2
sentinel down-after-milliseconds foodbot-redis 5000
sentinel parallel-syncs foodbot-redis 1
sentinel failover-timeout foodbot-redis 10000
```

**Failover Process:**
1. Sentinel detects master failure
2. Quorum of sentinels vote for failover
3. Promote replica to master
4. Reconfigure application to new master

**Duration:** ~10 seconds (automated)

---

## 5. Data Loss Scenarios

### Scenario 1: Accidental Table Drop

**Incident:** Engineer runs `DROP TABLE orders;` on production database.

**Recovery:**
1. Immediately stop all application writes
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=0
```

2. Perform PITR to 1 minute before incident
```bash
# Follow PITR procedure (see Section 3)
```

3. Verify data integrity
```bash
kubectl exec -n foodbot-data sts/postgres-app-0 -- psql -U postgres -d foodbot -c "SELECT count(*) FROM orders;"
```

4. Restart applications
```bash
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=3
```

**Duration:** ~20 minutes
**Data Loss:** 1 minute of orders

### Scenario 2: Ransomware Attack

**Incident:** Attacker encrypts all database files.

**Recovery:**
1. Isolate infected systems
```bash
# Block all traffic to compromised pods
kubectl label pods -n foodbot-data --all quarantine=true
kubectl apply -f network-policy-isolate.yaml
```

2. Rebuild cluster from clean images
```bash
# Delete all pods and PVCs
kubectl delete namespace foodbot-data --force

# Recreate namespace
kubectl create namespace foodbot-data

# Restore from backups
# (Follow PostgreSQL, Redis, Elasticsearch recovery procedures)
```

3. Restore application secrets (from encrypted backup)
```bash
aws s3 cp s3://foodbot-backups/secrets/secrets-$(date +%Y%m%d).yaml.gpg .
gpg --decrypt secrets-*.yaml.gpg | kubectl apply -f -
```

4. Redeploy applications
```bash
kubectl apply -f k8s/
```

**Duration:** ~2 hours
**Data Loss:** Up to 1 hour (RPO)

### Scenario 3: AWS Region Failure

**Incident:** Entire us-east-1 region unavailable.

**Recovery:**
1. Failover to DR region (us-west-2) - see Section 4
2. Promote DR PostgreSQL to primary
3. Update DNS to DR region
4. Scale up DR resources
5. Monitor replication lag and performance

**Duration:** ~5 minutes (automated)
**Data Loss:** ~30 seconds (replication lag)

---

## 6. DR Testing Schedule

### Monthly DR Drills

**Schedule:** First Saturday of each month, 2 AM - 6 AM

**Test Scenarios:**
- **Month 1:** PostgreSQL PITR recovery
- **Month 2:** Elasticsearch index restore
- **Month 3:** Multi-region failover (full stack)
- **Month 4:** Kafka topic replay
- **Month 5:** Redis failover
- **Month 6:** Complete region failure simulation

**Test Procedure:**
1. Create isolated test environment (DR-TEST namespace)
2. Inject failure (simulate database corruption, pod crashes, etc.)
3. Execute recovery procedure
4. Measure RTO/RPO
5. Document lessons learned
6. Update runbook

**Success Criteria:**
- RTO within target (15 min for critical services)
- RPO within target (1 hour for databases)
- Zero data loss for replicated systems
- All monitoring/alerting functional after recovery

### Annual Full DR Test

**Schedule:** Q1, during low-traffic period

**Test Scenario:** Complete primary region failure

**Steps:**
1. Notify stakeholders (customers, team, management)
2. Shutdown primary region (us-east-1)
3. Failover to DR region (us-west-2)
4. Run full regression tests
5. Operate on DR for 24 hours
6. Failback to primary region
7. Post-mortem and documentation update

**Success Criteria:**
- Failover completed in < 10 minutes
- All critical services operational on DR
- No customer-impacting issues during DR operation
- Successful failback without data loss

---

## DR Contacts

### Escalation Chain

| Role | Primary Contact | Secondary Contact |
|------|----------------|-------------------|
| **Incident Commander** | SRE Lead | Engineering Manager |
| **Database Engineer** | DBA Team Lead | Senior Backend Engineer |
| **Infrastructure Engineer** | DevOps Lead | Cloud Architect |
| **Security Engineer** | Security Lead | CISO |

### External Contacts

| Vendor | Service | Support Contact | SLA |
|--------|---------|----------------|-----|
| **AWS** | Infrastructure | aws-support@foodbot.com | 15 min (Business Critical) |
| **MongoDB Atlas** | Managed Database | mongodb-support@foodbot.com | 30 min (P1) |
| **PagerDuty** | Incident Management | support@pagerduty.com | 1 hour |

---

## Appendix: Recovery Checklists

### PostgreSQL Recovery Checklist

- [ ] Alert team via Slack #incidents
- [ ] Stop application writes (scale Gateway API to 0)
- [ ] Identify recovery target time
- [ ] Download base backup from S3
- [ ] Stop PostgreSQL pod
- [ ] Clear data directory
- [ ] Restore base backup
- [ ] Configure recovery.conf with target time
- [ ] Start PostgreSQL and monitor logs
- [ ] Verify data integrity
- [ ] Restart application pods
- [ ] Monitor error rates and latency
- [ ] Update status page to "Resolved"
- [ ] Schedule post-mortem

### Multi-Region Failover Checklist

- [ ] Confirm primary region is unrecoverable
- [ ] Alert team and management
- [ ] Update status page: "Major Outage"
- [ ] Promote DR PostgreSQL to primary
- [ ] Update Route 53 DNS to DR region
- [ ] Scale up DR application pods (3x normal)
- [ ] Verify health checks passing
- [ ] Run smoke tests
- [ ] Monitor error rates (target < 1%)
- [ ] Monitor latency (target < 500ms p95)
- [ ] Update status page: "Monitoring"
- [ ] Begin primary region recovery
- [ ] Plan failback procedure
- [ ] Schedule post-mortem

---

**Questions?** Contact #disaster-recovery on Slack or email dr@foodbot.com
