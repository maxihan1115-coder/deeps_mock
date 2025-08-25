FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install
RUN echo "=== DEPENDENCIES INSTALLED ==="

# Generate Prisma client
RUN echo "=== GENERATING PRISMA CLIENT ==="
RUN npx prisma generate
RUN echo "=== PRISMA CLIENT GENERATED ==="

# Build the application
RUN echo "=== STARTING BUILD ==="
RUN npm run build
RUN echo "=== BUILD COMPLETED ==="
RUN ls -la
RUN echo "=== DIRECTORY LISTING COMPLETED ==="

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
