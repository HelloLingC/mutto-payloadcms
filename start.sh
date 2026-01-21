#!/usr/bin/env bash
set -e

# make sure nodejs runtime and pm2 has been installed:
# npm install pm2 -g
# ===== CONFIG =====
APP_NAME="payload-app"
APP_DIR="/var/www/payload-app"
GIT_REPO="https://github.com/HelloLingC/mutto-payloadcms.git"
BRANCH="main"

NODE_ENV="production"

# ===== LOAD ENV =====
export NODE_ENV=$NODE_ENV

echo "🚀 Deploying PayloadCMS..."

# ===== FIRST TIME SETUP =====
if [ ! -d "$APP_DIR" ]; then
  echo "📁 App directory not found, cloning repo..."
  mkdir -p /var/www
  cd /var/www
  git clone -b $BRANCH $GIT_REPO payload-app
fi

cd $APP_DIR

# ===== UPDATE CODE =====
echo "🔄 Pulling latest code..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# ===== INSTALL DEPS =====
echo "📦 Installing dependencies..."
npm install --production

# ===== BUILD (if using Next.js / TS) =====
if [ -f "package.json" ]; then
  if grep -q "\"build\":" package.json; then
    echo "🏗️ Building app..."
    npm run build
  fi
fi

# ===== RUN MIGRATIONS (Payload) =====
if grep -q "payload migrate" package.json; then
  echo "🗄️ Running Payload migrations..."
  npm run payload:migrate || true
fi

# ===== RESTART WITH PM2 =====
if pm2 list | grep -q "$APP_NAME"; then
  echo "♻️ Restarting app with PM2..."
  pm2 restart $APP_NAME
else
  echo "▶️ Starting app with PM2..."
  pm2 start npm --name "$APP_NAME" -- start
fi

pm2 save

echo "✅ Deployment finished successfully!"
