FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Install serve for frontend
RUN npm install -g serve

# Copy worker
COPY worker/package*.json ./worker/
RUN cd worker && npm install
COPY worker/ ./worker/

# Start script that runs both frontend and worker
COPY <<EOF /app/start.sh
#!/bin/sh
echo "🦞 Starting MoltEthos..."
cd /app/worker && node index.js &
serve /app/frontend/dist -s -l 3000 &
wait
EOF
RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/bin/sh", "/app/start.sh"]
