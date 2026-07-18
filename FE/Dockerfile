FROM node:20-alpine

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
