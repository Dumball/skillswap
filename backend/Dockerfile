# Base Image
FROM node:18-alpine

# Set Working Directory
WORKDIR /app

# Install Dependencies
COPY package*.json ./
RUN npm install

# Copy Setup
COPY . .

# Expose API PORT
EXPOSE 5000

# Run Application
CMD ["npm", "start"]
