FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node server.mjs coach-server.mjs ./
COPY --chown=node:node dist/ ./dist/
USER node
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
