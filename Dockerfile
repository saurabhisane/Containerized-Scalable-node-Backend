FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose gateway port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => {if (res.statusCode === 200) process.exit(0); else process.exit(1);})"

# Start gateway
CMD ["npm", "start"]