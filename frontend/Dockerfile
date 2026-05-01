FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json vite.config.ts ./
COPY src ./src
COPY index.html ./

EXPOSE 5173

CMD ["npm", "run", "dev"]
