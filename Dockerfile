FROM node:20-alpine
RUN apk add --no-cache python3 make g++ git
WORKDIR /app
# Build argument - inject via HF Spaces "Repository secrets" at build time

RUN git clone --depth 1 https://github.com/lemmebemusa/e-commerce-backend.git .
RUN npm ci
# Runtime environment variables
ENV PORT=7860
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1
CMD ["node", "index.js"]
