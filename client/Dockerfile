# ONLY use Nginx. Do not use Node/npm here to save server resources.
FROM nginx:alpine

# Copy the 'dist' folder that GitHub Actions uploaded to the server
# Note: This assumes SCP action placed the files in client/dist
COPY dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]