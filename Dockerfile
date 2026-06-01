# Static site — nginx serves the games. No build step, no runtime deps.
#   docker build -t interactive-lab .
#   docker run -p 8090:80 interactive-lab
FROM nginx:1.27-alpine
COPY *.html *.js *.css favicon.svg /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
