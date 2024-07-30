FROM node:16-alpine3.15 as builder
WORKDIR /home/go-chat-web
COPY ./ /home/go-chat-web

RUN npm config set registry http://registry.npm.taobao.org
RUN npm install
RUN npm run build && rm -rf ./node_modules

WORKDIR /home/go-chat-web
COPY --from=builder /home/go-chat-web/build /home/go-chat-web
RUN npm config set registry http://registry.npm.taobao.org
RUN npm install -g serve

CMD ["serve", "-s"]


# 如果本地编译好，直接复制build文件后运行
# FROM node:16-alpine3.15
# WORKDIR /home/go-chat-web
# COPY ./ /home/go-chat-web
# RUN npm config set registry http://registry.npm.taobao.org
# RUN npm install -g serve
# CMD ["serve", "-s"]