#!/bin/bash
export CI=false
export DISABLE_ESLINT_PLUGIN=true
export GENERATE_SOURCEMAP=false

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm install --prefer-offline --no-audit --no-fund
fi

# Build the app
npm run build

# Start the server
npx serve -s build -p ${PORT:-3000}
