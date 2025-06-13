FROM node:22-alpine

# Папка приложения
ARG APP_DIR=app

RUN mkdir -p ${APP_DIR}
RUN mkdir -p ${APP_DIR}/config
WORKDIR ${APP_DIR}

# Установка зависимостей
COPY package.json ./
RUN npm install

COPY . .

# Запуск проекта
CMD ["npm", "start"]