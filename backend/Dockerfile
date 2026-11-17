# Build context is the project root, because the API also reads docs/ and database/.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend ./
COPY docs /app/docs
COPY database /app/database
USER node
EXPOSE 4000
# Create/upgrade tables, then start the API.
CMD ["sh", "-c", "node scripts/migrate.js && node server.js"]
