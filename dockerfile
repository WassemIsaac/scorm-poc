FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install           # install all deps

COPY . .

RUN npm run build         # build Angular

EXPOSE 3000

CMD ["npm", "start"]
