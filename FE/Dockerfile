FROM node:20-alpine

# Add compatibility libraries for native SWC compilation
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy application files
COPY . .

# Build Next.js application
RUN npm run build

# Expose Next.js production server port
EXPOSE 3000

CMD ["npm", "run", "start"]
