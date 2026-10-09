#!/usr/bin/env bash
# DESTRUCTIVE: deletes all horse-admin AWS resources in reverse order. Never run automatically.
set -uo pipefail
export MSYS_NO_PATHCONV=1 AWS_PAGER="" AWS_DEFAULT_REGION=ap-northeast-2
BUCKET=horse-admin-photos-896860228345
read -r -p "Type DELETE to destroy all horse-admin resources: " a; [ "$a" = DELETE ] || exit 1
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='horse-admin-api'].ApiId | [0]" --output text)
[ "$API_ID" != None ] && aws apigatewayv2 delete-api --api-id "$API_ID"
INSTANCE=$(aws ec2 describe-instances --filters Name=tag:Name,Values=horse-admin-api Name=instance-state-name,Values=pending,running,stopping,stopped --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$INSTANCE" ]; then aws ec2 terminate-instances --instance-ids $INSTANCE >/dev/null; aws ec2 wait instance-terminated --instance-ids $INSTANCE; fi
EIP=$(aws ec2 describe-addresses --filters Name=tag:Name,Values=horse-admin-eip --query 'Addresses[0].AllocationId' --output text)
[ "$EIP" != None ] && aws ec2 release-address --allocation-id "$EIP"
aws ec2 delete-key-pair --key-name horse-admin-key; rm -f "$(dirname "$0")/secrets/horse-admin-key.pem"
aws iam remove-role-from-instance-profile --instance-profile-name horse-admin-ec2-role --role-name horse-admin-ec2-role
aws iam delete-instance-profile --instance-profile-name horse-admin-ec2-role
aws iam detach-role-policy --role-name horse-admin-ec2-role --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam delete-role-policy --role-name horse-admin-ec2-role --policy-name horse-admin-s3
aws iam delete-role --role-name horse-admin-ec2-role
aws rds delete-db-instance --db-instance-identifier horse-admin-db --skip-final-snapshot --delete-automated-backups >/dev/null
aws rds wait db-instance-deleted --db-instance-identifier horse-admin-db
for n in horse-admin-rds-sg horse-admin-ec2-sg; do
  id=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$n --query 'SecurityGroups[0].GroupId' --output text)
  [ "$id" != None ] && aws ec2 delete-security-group --group-id "$id"
done
aws s3 rb "s3://$BUCKET" --force
echo "teardown complete"
