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
RUN npm run build || (echo "Build failed" && exit 1)
RUN echo "Build completed successfully"

# Check build output
RUN echo "Checking build output..."
RUN ls -la .next/ || echo "No .next directory found"
RUN echo "Build output checked successfully"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
