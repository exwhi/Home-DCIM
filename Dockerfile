FROM node:18-bullseye

# Create app directory
WORKDIR /usr/src/app

# Install build tools required by some native modules (serialport/node-gyp)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates libusb-1.0-0-dev \
  && rm -rf /var/lib/apt/lists/*

# Install production dependencies first (cacheable)
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
