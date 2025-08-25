FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install
RUN echo "Dependencies installed successfully"

# Copy source code
COPY . .
RUN echo "Source code copied successfully"
RUN ls -la

# Generate Prisma client
RUN echo "Generating Prisma client..."
RUN npx prisma generate
RUN echo "Prisma client generated successfully"

# Build the application
RUN echo "Starting build process..."
RUN npm run build
RUN echo "Build completed successfully"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
