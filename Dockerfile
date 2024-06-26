# Use an official Node runtime as a parent image (Alpine for smaller footprint)
FROM node:lts-alpine3.15

WORKDIR /srv/www/apostrophe

RUN chown -R node: /srv/www/apostrophe
USER node

COPY --chown=node package*.json /srv/www/apostrophe/

ENV NODE_ENV=production

RUN npm install

COPY --chown=node . /srv/www/apostrophe/

RUN ./scripts/build-assets.sh

EXPOSE 3000

ENV APOS_MONGODB_URI=""
ENV ACTIVEMQ_HOST=""
ENV ACTIVEMQ_PORT=""
ENV ACTIVEMQ_USERNAME=""
ENV ACTIVEMQ_PASSWORD=""

# Command to run the app
CMD [ "node", "app.js" ]
