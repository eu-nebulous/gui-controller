# Use an official Node runtime as a parent image (Alpine for smaller footprint)
FROM node:20-bullseye

ARG BUILD_ID


COPY --chown=node . /srv/www/apostrophe/
RUN chown -R node: /srv/www/apostrophe

USER node
WORKDIR /srv/www/apostrophe

ENV NODE_ENV=production
RUN npm install
RUN ./scripts/build-assets.sh

EXPOSE 3000

ENV APOS_MONGODB_URI=""
ENV ACTIVEMQ_HOST=""
ENV ACTIVEMQ_PORT=""
ENV ACTIVEMQ_USERNAME=""
ENV ACTIVEMQ_PASSWORD=""
ENV OPENAI_KEY=""
ENV NEBULOUS_VERSION=${BUILD_ID}

# Command to run the app
CMD [ "node", "app.js" ]
