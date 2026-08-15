FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN mkdir -p /app/uploads

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
