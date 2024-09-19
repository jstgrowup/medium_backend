FROM node:18.20.4-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm install -g wrangler
RUN npx prisma generate
EXPOSE 8787
CMD [ "npm","run","dev"]