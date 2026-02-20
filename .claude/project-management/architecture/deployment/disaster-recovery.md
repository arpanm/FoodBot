# Disaster Recovery Architecture

**Component**: Disaster Recovery & Business Continuity
**Status**: ✅ Implemented
**Version**: 1.0.0
**Last Updated**: 2026-02-20
**Owner**: SRE Team

---

## Overview

FoodBot's disaster recovery (DR) architecture ensures business continuity through automated backups, failover procedures, and multi-region deployment capabilities. The system is designed to minimize data loss (RPO) and downtime (RTO) in case of failures.

## Recovery Objectives

| Component | RPO (Data Loss) | RTO (Downtime) | Backup Frequency |
|-----------|-----------------|----------------|------------------|
| PostgreSQL (App) | 1 hour | 15 minutes | Continuous WAL + Daily |
| PostgreSQL (Temporal) | 1 hour | 15 minutes | Continuous WAL + Daily |
| Redis | 1 second | 5 minutes | AOF + Daily RDB |
| Elasticsearch | 24 hours | 30 minutes | Daily Snapshot |
| Kafka | 0 (replicated) | 5 minutes | 7-90 days retention |
| Application Code | 0 (Git) | 10 minutes | Git commits |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRIMARY REGION (us-east-1)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│  │   Application   │    │   PostgreSQL   │    │      Redis      │  │
│  │     Stack       │───>│    Primary     │───>│     Primary     │  │
│  │   (Active)      │    │                │    │                 │  │
│  └────────────────┘    └───────┬────────┘    └────────┬────────┘  │
│                                 │                      │            │
│                                 │ Streaming            │ AOF        │
│                                 │ Replication          │ Replication│
└─────────────────────────────────┼──────────────────────┼────────────┘
                                  │                      │
                                  v                      v
┌─────────────────────────────────────────────────────────────────────┐
│                      DR REGION (us-west-2)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│  │   Application   │    │   PostgreSQL   │    │      Redis      │  │
│  │     Stack       │    │  Read Replica  │    │     Replica     │  │
│  │   (Standby)     │    │                │    │                 │  │
│  └────────────────┘    └────────────────┘    └─────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

                                  │
                                  v
┌─────────────────────────────────────────────────────────────────────┐
│                         S3 BACKUP STORAGE                            │
├─────────────────────────────────────────────────────────────────────┤
│  • PostgreSQL Backups (30 days)                                     │
│  • Redis Snapshots (7 days)                                         │
│  • Elasticsearch Snapshots (30 days)                                │
│  • Application Configs (encrypted)                                  │
│  • Kubernetes Secrets (encrypted)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Backup Strategy

### PostgreSQL Backups

**Continuous Archiving (WAL)**:
- WAL files archived to S3 every 5 minutes
- Enables point-in-time recovery
- Retention: 30 days

**Daily Full Backup**:
- Automated via CronJob at 2 AM daily
- Compressed format (`pg_dump -Fc`)
- Uploaded to S3
- Verified after upload
- Retention: 30 days

**Recovery Procedure**:
```bash
# 1. Stop application
kubectl scale deployment/gateway-api --replicas=0

# 2. Download base backup
aws s3 cp s3://foodbot-backups/postgres-daily/latest.sql.gz .

# 3. Restore base backup
gunzip -c latest.sql.gz | kubectl exec -i postgres-0 -- psql -U postgres -d foodbot

# 4. Apply WAL for PITR
kubectl exec postgres-0 -- sh -c "
  restore_command = 'aws s3 cp s3://foodbot-backups/postgres-wal/%f %p'
  recovery_target_time = '2026-02-20 10:25:00'
"

# 5. Restart application
kubectl scale deployment/gateway-api --replicas=3
```

### Redis Backups

**AOF (Append-Only File)**:
- Every write persisted to disk
- `fsync` every second
- Minimal data loss (< 1 second)

**RDB Snapshots**:
- Daily snapshot via `BGSAVE`
- Uploaded to S3
- Retention: 7 days

**Recovery Procedure**:
```bash
# 1. Download RDB backup
aws s3 cp s3://foodbot-backups/redis/latest.rdb dump.rdb

# 2. Stop Redis
kubectl scale sts/redis --replicas=0

# 3. Replace RDB file
kubectl cp dump.rdb redis-0:/data/dump.rdb

# 4. Start Redis
kubectl scale sts/redis --replicas=1
```

### Elasticsearch Backups

**Snapshot Lifecycle Policy**:
- Daily snapshots at 1:30 AM
- Stored in S3
- Retention: 30 days
- Auto-cleanup of old snapshots

**Recovery Procedure**:
```bash
# 1. List snapshots
curl "http://elasticsearch:9200/_snapshot/s3_backup/_all?pretty"

# 2. Close indices
curl -X POST "http://elasticsearch:9200/foodbot_*/_close"

# 3. Restore snapshot
curl -X POST "http://elasticsearch:9200/_snapshot/s3_backup/snapshot-2026-02-20/_restore" \
  -H 'Content-Type: application/json' \
  -d '{"indices": "foodbot_*"}'

# 4. Monitor restore
curl "http://elasticsearch:9200/_recovery?human&pretty"
```

### Kafka Data Retention

**Topic Retention**:
- Critical topics: 90 days retention
- Standard topics: 7 days retention
- Messages replicated across 3 brokers

**Mirror Maker 2**:
- Cross-region replication to DR site
- Near real-time replication
- Automatic failover

### Secrets Backup

**Encrypted Backup**:
```bash
# Export secrets
kubectl get secrets -n foodbot-apps -o yaml > secrets-apps.yaml

# Encrypt with GPG
gpg --encrypt --recipient ops@foodbot.com secrets-apps.yaml

# Upload to S3
aws s3 cp secrets-apps.yaml.gpg s3://foodbot-backups/secrets/
```

## Failover Procedures

### Multi-Region Failover

**Trigger Conditions**:
- Primary region health checks fail for 3 consecutive attempts
- AWS region outage declared
- Planned maintenance requiring full region migration

**Automated Failover** (via Route 53 health checks):
```
1. Route 53 detects primary region failure (3 failed health checks)
2. DNS updated to point to DR region (TTL: 60s)
3. DR PostgreSQL promoted to primary (automatic via Patroni)
4. DR application pods scaled up (HPA)
5. Traffic routed to DR region
6. Primary region marked as degraded

Duration: ~5 minutes
Data Loss: ~30 seconds (replication lag)
```

**Manual Failover**:
```bash
# 1. Verify primary region is down
curl https://api.foodbot.com/health

# 2. Promote DR PostgreSQL
kubectl exec -n foodbot-data postgres-0 -- \
  psql -U postgres -c "SELECT pg_promote();"

# 3. Update Route 53 DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://failover-dns.json

# 4. Scale up DR application pods
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=10

# 5. Verify health
curl https://api.foodbot.com/health

# 6. Monitor error rates and latency
```

### Database Failover (PostgreSQL with Patroni)

**Automatic Failover**:
- Patroni detects primary failure (health check timeout)
- Elects new primary from synchronous replica
- Promotes replica to primary
- Updates connection endpoints
- Duration: ~30 seconds

### Redis Sentinel Failover

**Automatic Failover**:
- Sentinel detects master failure
- Quorum vote for failover
- Promote replica to master
- Reconfigure clients
- Duration: ~10 seconds

## Recovery Procedures

### Scenario 1: Complete Database Loss

**Impact**: All PostgreSQL data lost
**Recovery Time**: ~20 minutes
**Data Loss**: Up to 1 hour

```bash
# 1. Stop applications
kubectl scale deployment/gateway-api --replicas=0

# 2. Recreate database pod
kubectl delete pvc postgres-app-data-0
kubectl scale sts/postgres-app --replicas=1

# 3. Download latest backup
LATEST=$(aws s3 ls s3://foodbot-backups/postgres-daily/ | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://foodbot-backups/postgres-daily/$LATEST restore.sql.gz

# 4. Restore backup
gunzip -c restore.sql.gz | kubectl exec -i postgres-app-0 -- \
  pg_restore -U postgres -d foodbot -v

# 5. Verify data
kubectl exec postgres-app-0 -- psql -U postgres -d foodbot -c "SELECT count(*) FROM orders;"

# 6. Restart applications
kubectl scale deployment/gateway-api --replicas=3
```

### Scenario 2: Accidental Table Drop

**Impact**: Critical table dropped
**Recovery Time**: ~20 minutes
**Data Loss**: 1 minute (PITR)

```bash
# 1. Immediately stop writes
kubectl scale deployment/gateway-api --replicas=0

# 2. Note exact incident time
INCIDENT_TIME="2026-02-20 10:30:00"

# 3. Perform PITR to 1 minute before incident
# (See PostgreSQL PITR procedure above)

# 4. Verify table restored
kubectl exec postgres-app-0 -- psql -U postgres -d foodbot -c "\dt orders"

# 5. Resume operations
kubectl scale deployment/gateway-api --replicas=3
```

### Scenario 3: Ransomware Attack

**Impact**: Files encrypted, systems compromised
**Recovery Time**: ~2 hours
**Data Loss**: Up to 1 hour (RPO)

```bash
# 1. Isolate infected systems
kubectl label pods --all quarantine=true
kubectl apply -f network-policy-isolate.yaml

# 2. Delete compromised namespace
kubectl delete namespace foodbot-data --force

# 3. Rebuild from clean images
kubectl create namespace foodbot-data

# 4. Restore from encrypted backups
aws s3 cp s3://foodbot-backups/secrets/secrets-latest.yaml.gpg .
gpg --decrypt secrets-latest.yaml.gpg | kubectl apply -f -

# 5. Restore databases (see procedures above)

# 6. Redeploy applications
kubectl apply -f k8s/

# 7. Verify integrity
./scripts/health-check.sh
```

### Scenario 4: AWS Region Failure

**Impact**: Entire primary region unavailable
**Recovery Time**: ~5 minutes (automated failover)
**Data Loss**: ~30 seconds (replication lag)

```
1. Route 53 health checks fail for 3 attempts
2. DNS automatically updated to DR region
3. DR PostgreSQL promoted to primary
4. DR application pods scaled up
5. Traffic routed to DR
6. Monitor performance and error rates
```

## Testing Schedule

### Monthly DR Drills

**Schedule**: First Saturday of month, 2-6 AM

**Test Rotation**:
- Month 1: PostgreSQL PITR recovery
- Month 2: Elasticsearch index restore
- Month 3: Multi-region failover (full stack)
- Month 4: Kafka topic replay
- Month 5: Redis failover
- Month 6: Complete region failure simulation

**Success Criteria**:
- RTO within target (15 min for critical services)
- RPO within target (1 hour for databases)
- Zero data loss for replicated systems
- All monitoring/alerting functional

### Annual Full DR Test

**Schedule**: Q1, during low-traffic period

**Test Scenario**: Complete primary region failure

```bash
# 1. Notify stakeholders
# 2. Shutdown primary region
# 3. Failover to DR region
# 4. Operate on DR for 24 hours
# 5. Failback to primary
# 6. Post-mortem and documentation
```

## Monitoring

### Backup Monitoring

**Alerts**:
- Backup job failure
- Backup size anomaly (too small = data loss)
- Backup age too old
- S3 upload failure

**Metrics**:
```promql
# Backup success rate
rate(backup_success_total[1d]) / rate(backup_attempts_total[1d])

# Backup duration
backup_duration_seconds

# Backup size
backup_size_bytes
```

### Replication Monitoring

**Alerts**:
- PostgreSQL replication lag > 10 seconds
- Redis replication lag > 5 seconds
- Kafka consumer lag > 10,000 messages

**Metrics**:
```promql
# PostgreSQL replication lag
pg_replication_lag_seconds

# Redis replication lag
redis_replication_lag_seconds

# Kafka consumer lag
kafka_consumer_lag_messages
```

## Dependencies

- AWS S3 for backup storage
- Route 53 for DNS failover
- Multi-region VPC setup
- Cross-region replication enabled

## Related Documentation

- [Disaster Recovery Plan](../../archive/architecture/DISASTER_RECOVERY.md) - Detailed procedures
- [Production Runbook](../../archive/guides/PRODUCTION_RUNBOOK.md) - Operational procedures
- [Backup Procedures](../../archive/guides/PRODUCTION_RUNBOOK.md#5-backup-and-restore)
- [Troubleshooting Guide](../../archive/guides/TROUBLESHOOTING.md)

## Maintenance

- **Weekly**: Verify backup completion logs
- **Monthly**: Test restore procedures
- **Quarterly**: Review and update RTO/RPO targets
- **Annually**: Full DR failover test

---

**Maintained by**: SRE Team
**Review Cycle**: Quarterly
**Last Tested**: 2026-02-15 (PostgreSQL PITR)
**Next DR Drill**: 2026-03-01
