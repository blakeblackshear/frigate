ARG NODE_VERSION=14.0

FROM node:${NODE_VERSION}

WORKDIR /opt/frigate

COPY . .

RUN npm install && npm run build
