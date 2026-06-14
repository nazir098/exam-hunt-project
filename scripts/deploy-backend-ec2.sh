#!/usr/bin/env bash
set -euo pipefail

KEY_PATH="${KEY_PATH:-$HOME/Downloads/nazir.pem}"
EC2_HOST="${EC2_HOST:-3.80.221.101}"
EC2_USER="${EC2_USER:-ec2-user}"
JAR_NAME="exam-hunt-api-0.1.0-SNAPSHOT.jar"

cd "$(dirname "$0")/../backend"

mvn clean package
scp -i "$KEY_PATH" "target/$JAR_NAME" "$EC2_USER@$EC2_HOST:/home/ec2-user/exam-hunt-api.jar"
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" \
  'sudo systemctl restart exam-hunt && sudo systemctl status exam-hunt --no-pager'
