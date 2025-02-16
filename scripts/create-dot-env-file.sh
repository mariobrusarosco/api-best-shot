#!/bin/sh

check_dot_env_exists() {
  if [ -f "/app/.env" ]; then
    return 0
  fi
  return 1
}


create_dot_env_file() {
  if check_dot_env_exists; then
    FILE_NAME=".env.new-file-with-default-values"
  else
    FILE_NAME=".env"
  fi

  PATH_TO_ENV_FILE="/app/$FILE_NAME"
  
  echo "DB_USER=dev_user" > $PATH_TO_ENV_FILE
  echo "DB_PASSWORD=dev_pass" >> $PATH_TO_ENV_FILE
  echo "DB_NAME=bestshot_dev" >> $PATH_TO_ENV_FILE
  echo "DB_HOST=postgres" >> $PATH_TO_ENV_FILE
  echo "DB_PORT=5432" >> $PATH_TO_ENV_FILE
  echo "NODE_ENV=development" >> $PATH_TO_ENV_FILE
  echo "SENTRY_DSN=https://sentry.io/" >> $PATH_TO_ENV_FILE
  echo "PORT=9090" >> $PATH_TO_ENV_FILE
  echo "ACCESS_CONTROL_ALLOW_ORIGIN=*" >> $PATH_TO_ENV_FILE
  echo "AWS_ACCESS_KEY_ID=1234567890" >> $PATH_TO_ENV_FILE
  echo "AWS_SECRET_ACCESS_KEY=1234567890" >> $PATH_TO_ENV_FILE
  echo "AWS_BUCKET_NAME=bestshot-dev" >> $PATH_TO_ENV_FILE
  echo "JWT_SECRET=1234567890" >> $PATH_TO_ENV_FILE
  echo "MEMBER_PUBLIC_ID_COOKIE=1234567890" >> $PATH_TO_ENV_FILE

  echo "📝 [ENV VARS] - Created $FILE_NAME ✅"
  
  return 1
}

handle_dot_env_creation() {
  create_dot_env_file
}