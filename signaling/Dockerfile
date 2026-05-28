FROM denoland/deno:2.3.3
WORKDIR /app
COPY server.ts .
RUN deno cache server.ts
CMD ["deno", "run", "--allow-net", "--allow-env", "server.ts"]
