FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY env.sample ./env.sample

EXPOSE 4000
CMD ["sh", "-c", "node src/migrate.js && node src/server.js"]

