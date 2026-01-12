FROM node:24-alpine

ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV CONTAINERIZED=1
ENV CONTAINER_FILE_PATH=/mnt/host-downloads

WORKDIR /app

RUN npm config set registry ${NPM_REGISTRY}
RUN npm install -g @wenyan-md/cli && npm cache clean --force

ENTRYPOINT ["wenyan"]

CMD ["--help"]
