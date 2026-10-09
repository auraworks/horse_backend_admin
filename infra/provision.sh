#!/usr/bin/env bash
# Re-runnable provisioning for horse-admin. Requires AWS CLI v2, python.
set -euo pipefail
export MSYS_NO_PATHCONV=1 AWS_PAGER=""
export AWS_DEFAULT_REGION=ap-northeast-2
DIR="$(cd "$(dirname "$0")" && pwd)"
SEC="$DIR/secrets"; mkdir -p "$SEC"
ACCOUNT=896860228345; REGION=ap-northeast-2
VPC=vpc-0fcaf565a2345d92c
DEV_IP=14.52.96.42/32
BUCKET=horse-admin-photos-$ACCOUNT
TAG="Key=Project,Value=horse-admin"
PYBIN=$(command -v python || command -v python3)
log(){ echo "[provision] $*"; }
randalnum(){ $PYBIN -c "import secrets,string;print(''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range($1)))"; }

# api key (generated once)
if [ ! -f "$SEC/api-key.env" ]; then
  echo "API_ACCESS_KEY=$(randalnum 40)" > "$SEC/api-key.env"
fi

# 1. S3
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  log "create bucket"
  aws s3api create-bucket --bucket "$BUCKET" --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION >/dev/null
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-tagging --bucket "$BUCKET" --tagging 'TagSet=[{Key=Project,Value=horse-admin}]'

# 2. Security groups
sg_id(){ aws ec2 describe-security-groups --filters Name=group-name,Values="$1" Name=vpc-id,Values=$VPC \
  --query 'SecurityGroups[0].GroupId' --output text; }
mk_sg(){ local id; id=$(sg_id "$1"); if [ "$id" = "None" ]; then
  id=$(aws ec2 create-security-group --group-name "$1" --description "$2" --vpc-id $VPC \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=horse-admin},{Key=Name,Value=$1}]" \
    --query GroupId --output text); fi; echo "$id"; }
EC2_SG=$(mk_sg horse-admin-ec2-sg "horse-admin EC2 API")
RDS_SG=$(mk_sg horse-admin-rds-sg "horse-admin RDS")
auth(){ aws ec2 authorize-security-group-ingress --group-id "$1" "${@:2}" >/dev/null 2>&1 || true; }
auth $EC2_SG --protocol tcp --port 22 --cidr $DEV_IP
auth $EC2_SG --protocol tcp --port 8000 --cidr 0.0.0.0/0
auth $RDS_SG --protocol tcp --port 5432 --source-group $EC2_SG
auth $RDS_SG --protocol tcp --port 5432 --cidr $DEV_IP

# 3. RDS
DBID=horse-admin-db
if ! aws rds describe-db-instances --db-instance-identifier $DBID >/dev/null 2>&1; then
  PGVER=$(aws rds describe-orderable-db-instance-options --engine postgres --db-instance-class db.t4g.micro \
    --query 'OrderableDBInstanceOptions[].EngineVersion' --output text | tr '\t' '\n' | sort -V | tail -1)
  log "create RDS postgres $PGVER"
  DBPASS=$(randalnum 24)
  printf 'DB_PASSWORD=%s\n' "$DBPASS" > "$SEC/.rds-pass"
  aws rds create-db-instance --db-instance-identifier $DBID --db-instance-class db.t4g.micro \
    --engine postgres --engine-version "$PGVER" --allocated-storage 20 --storage-type gp3 \
    --master-username horse_admin --master-user-password "$DBPASS" --db-name horse_admin \
    --vpc-security-group-ids $RDS_SG --publicly-accessible --no-multi-az \
    --backup-retention-period 1 --tags $TAG >/dev/null
fi
if [ ! -f "$SEC/rds.env" ] && [ -f "$SEC/.rds-pass" ]; then
  # write creds as early as possible (host filled after available)
  :
fi
log "waiting for RDS"
aws rds wait db-instance-available --db-instance-identifier $DBID
DB_HOST=$(aws rds describe-db-instances --db-instance-identifier $DBID --query 'DBInstances[0].Endpoint.Address' --output text)
if [ ! -f "$SEC/rds.env" ]; then
  . "$SEC/.rds-pass"
  cat > "$SEC/rds.env" <<EOT
DB_HOST=$DB_HOST
DB_PORT=5432
DB_USER=horse_admin
DB_PASSWORD=$DB_PASSWORD
DB_NAME=horse_admin
DATABASE_URL=postgresql+asyncpg://horse_admin:$DB_PASSWORD@$DB_HOST:5432/horse_admin
TEST_DATABASE_URL=postgresql+asyncpg://horse_admin:$DB_PASSWORD@$DB_HOST:5432/horse_admin_test
EOT
  rm -f "$SEC/.rds-pass"
fi
# test DB
VENV="${HORSE_INFRA_VENV:-C:/Users/Jay/AppData/Local/Temp/horse-infra-venv}"
[ -d "$VENV" ] || $PYBIN -m venv "$VENV"
VPY="$VENV/Scripts/python"; [ -e "$VPY" ] || [ -e "$VPY.exe" ] || VPY="$VENV/bin/python"
"$VPY" -c 'import psycopg' 2>/dev/null || "$VPY" -m pip install -q "psycopg[binary]"
RDS_ENV="$(cygpath -m "$SEC/rds.env" 2>/dev/null || echo "$SEC/rds.env")" "$VPY" - <<'PY'
import os, psycopg
e = dict(l.strip().split("=",1) for l in open(os.environ["RDS_ENV"]) if "=" in l)
c = psycopg.connect(host=e["DB_HOST"], port=e["DB_PORT"], user=e["DB_USER"], password=e["DB_PASSWORD"], dbname="postgres", autocommit=True, connect_timeout=15)
if not c.execute("select 1 from pg_database where datname='horse_admin_test'").fetchone():
    c.execute("create database horse_admin_test"); print("created horse_admin_test")
else:
    print("horse_admin_test exists")
PY

# 4. IAM
ROLE=horse-admin-ec2-role
if ! aws iam get-role --role-name $ROLE >/dev/null 2>&1; then
  aws iam create-role --role-name $ROLE --tags $TAG --assume-role-policy-document \
   '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
fi
aws iam put-role-policy --role-name $ROLE --policy-name horse-admin-s3 --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],\"Resource\":\"arn:aws:s3:::$BUCKET/*\"},{\"Effect\":\"Allow\",\"Action\":\"s3:ListBucket\",\"Resource\":\"arn:aws:s3:::$BUCKET\"}]}"
aws iam attach-role-policy --role-name $ROLE --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
if ! aws iam get-instance-profile --instance-profile-name $ROLE >/dev/null 2>&1; then
  aws iam create-instance-profile --instance-profile-name $ROLE --tags $TAG >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name $ROLE --role-name $ROLE
  log "waiting for IAM propagation"; sleep 15
fi

# 5. Key pair
if ! aws ec2 describe-key-pairs --key-names horse-admin-key >/dev/null 2>&1; then
  aws ec2 create-key-pair --key-name horse-admin-key --key-type rsa \
    --tag-specifications "ResourceType=key-pair,Tags=[{Key=Project,Value=horse-admin}]" \
    --query KeyMaterial --output text > "$SEC/horse-admin-key.pem"
fi

# 6. EC2 + EIP
INSTANCE=$(aws ec2 describe-instances --filters Name=tag:Name,Values=horse-admin-api \
  Name=instance-state-name,Values=pending,running,stopping,stopped --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -z "$INSTANCE" ]; then
  AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 --query Parameter.Value --output text)
  log "launch EC2 from $AMI"
  INSTANCE=$(aws ec2 run-instances --image-id "$AMI" --instance-type t4g.micro --key-name horse-admin-key \
    --security-group-ids $EC2_SG --iam-instance-profile Name=$ROLE \
    --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3}' \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=horse-admin-api},{Key=Project,Value=horse-admin}]" \
              "ResourceType=volume,Tags=[{Key=Project,Value=horse-admin}]" \
    --query 'Instances[0].InstanceId' --output text)
fi
aws ec2 wait instance-running --instance-ids $INSTANCE
EIP_ALLOC=$(aws ec2 describe-addresses --filters Name=tag:Name,Values=horse-admin-eip --query 'Addresses[0].AllocationId' --output text)
if [ "$EIP_ALLOC" = "None" ]; then
  EIP_ALLOC=$(aws ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=horse-admin-eip},{Key=Project,Value=horse-admin}]" \
    --query AllocationId --output text)
fi
aws ec2 associate-address --instance-id $INSTANCE --allocation-id $EIP_ALLOC >/dev/null
EIP=$(aws ec2 describe-addresses --allocation-ids $EIP_ALLOC --query 'Addresses[0].PublicIp' --output text)

# 7. API Gateway
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='horse-admin-api'].ApiId | [0]" --output text)
if [ "$API_ID" = "None" ]; then
  API_ID=$(aws apigatewayv2 create-api --name horse-admin-api --protocol-type HTTP --tags Project=horse-admin --query ApiId --output text)
fi
mk_int(){ local id; id=$(aws apigatewayv2 get-integrations --api-id $API_ID --query "Items[?IntegrationUri=='$1'].IntegrationId | [0]" --output text)
  if [ "$id" = "None" ]; then id=$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type HTTP_PROXY \
    --integration-method ANY --integration-uri "$1" --payload-format-version 1.0 --query IntegrationId --output text); fi; echo "$id"; }
mk_route(){ local r; r=$(aws apigatewayv2 get-routes --api-id $API_ID --query "Items[?RouteKey=='$1'].RouteId | [0]" --output text)
  if [ "$r" = "None" ]; then aws apigatewayv2 create-route --api-id $API_ID --route-key "$1" --target "integrations/$2" >/dev/null
  else aws apigatewayv2 update-route --api-id $API_ID --route-id "$r" --target "integrations/$2" >/dev/null; fi; }
I1=$(mk_int "http://$EIP:8000/{proxy}"); I2=$(mk_int "http://$EIP:8000/")
mk_route 'ANY /{proxy+}' $I1
mk_route 'ANY /' $I2
NSTAGE=$(aws apigatewayv2 get-stages --api-id $API_ID --query 'length(Items)' --output text)
if [ "$NSTAGE" = "0" ]; then
  aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy >/dev/null
fi
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com"

cat > "$DIR/outputs.json" <<EOT
{
  "region": "$REGION",
  "bucket": "$BUCKET",
  "ec2SecurityGroupId": "$EC2_SG",
  "rdsSecurityGroupId": "$RDS_SG",
  "rdsIdentifier": "$DBID",
  "rdsEndpoint": "$DB_HOST",
  "instanceId": "$INSTANCE",
  "elasticIp": "$EIP",
  "elasticIpAllocationId": "$EIP_ALLOC",
  "apiId": "$API_ID",
  "apiUrl": "$API_URL"
}
EOT
log "done: $API_URL"
