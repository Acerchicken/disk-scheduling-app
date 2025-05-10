# Sử dụng Node.js LTS làm base image
FROM node:18-alpine 

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép file package.json và package-lock.json trước để cài dependencies
COPY package*.json ./ 

# Cài đặt dependencies
RUN npm install 

# Sao chép toàn bộ code vào container
COPY . . 


# Mở cổng 3001
EXPOSE 3001

# Chạy ứng dụng Next.js
CMD ["npm", "start"]
