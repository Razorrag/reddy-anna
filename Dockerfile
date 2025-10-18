FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose ports for RTMP and HTTP
EXPOSE 3000 1935 8000

CMD ["npm", "run", "dev"]