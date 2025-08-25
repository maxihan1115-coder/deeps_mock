FROM node:20-alpine

# Install dependencies for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install --verbose

# Copy source code
COPY . .

# Generate Prisma client
RUN echo "Generating Prisma client..."
RUN npx prisma generate --verbose
RUN echo "Prisma client generated successfully"

# Build the application
RUN echo "Starting build process..."
RUN npm run build
RUN echo "Build completed successfully"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
