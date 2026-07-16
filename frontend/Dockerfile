FROM node:18-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy application files
COPY . .

# Expose Vite dev server port
EXPOSE 3000

CMD ["npm", "run", "dev"]
