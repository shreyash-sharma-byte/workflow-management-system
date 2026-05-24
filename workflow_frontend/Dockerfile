FROM node:20-alpine

WORKDIR /app

# Install Angular CLI
RUN npm install -g @angular/cli@17

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

EXPOSE 4200

CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
