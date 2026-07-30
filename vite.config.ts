import path from "node:path";
import { pathToFileURL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

function localApiPlugin(): Plugin {
  const legacyModules = new Map([
    ["/api/access/can", "./api/access/can.mjs"],
    ["/api/data", "./api/data.mjs"],
    ["/api/me", "./api/me.mjs"],
  ]);

  return {
    // Mirrors Vercel's same-origin API routing during local development.
    name: "amanah-local-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/api/")) {
          next();
          return;
        }

        try {
          const requestUrl = new URL(
            request.url,
            `http://${request.headers.host ?? "127.0.0.1"}`,
          );
          if (requestUrl.pathname.startsWith("/api/v1/")) {
            const { app } = await import("./api/app");
            const headers = new Headers();
            for (const [name, value] of Object.entries(request.headers)) {
              if (Array.isArray(value)) {
                value.forEach((item) => headers.append(name, item));
              } else if (value !== undefined) {
                headers.set(name, value);
              }
            }
            const hasBody = !["GET", "HEAD"].includes(
              request.method ?? "GET",
            );
            const chunks: Uint8Array[] = [];
            if (hasBody) {
              for await (const chunk of request) {
                chunks.push(
                  typeof chunk === "string"
                    ? Buffer.from(chunk)
                    : new Uint8Array(chunk),
                );
              }
            }
            const body = hasBody ? Buffer.concat(chunks) : undefined;
            const apiResponse = await app.fetch(
              new Request(requestUrl, {
                method: request.method ?? "GET",
                headers,
                ...(body && body.length > 0 ? { body } : {}),
              }),
            );
            response.statusCode = apiResponse.status;
            apiResponse.headers.forEach((value, name) => {
              if (name !== "set-cookie") response.setHeader(name, value);
            });
            const cookies = apiResponse.headers.getSetCookie();
            if (cookies.length > 0) response.setHeader("set-cookie", cookies);
            response.end(Buffer.from(await apiResponse.arrayBuffer()));
            return;
          }

          let modulePath = legacyModules.get(requestUrl.pathname);
          if (requestUrl.pathname.startsWith("/api/auth/")) {
            modulePath = "./api/auth/[...path].mjs";
          }
          if (!modulePath) {
            next();
            return;
          }
          const query = Object.fromEntries(requestUrl.searchParams.entries());
          if (requestUrl.pathname.startsWith("/api/auth/")) {
            query.path = requestUrl.pathname.slice("/api/auth/".length);
          }
          const hasLegacyBody = !["GET", "HEAD"].includes(
            request.method ?? "GET",
          );
          const legacyChunks: Uint8Array[] = [];
          if (hasLegacyBody) {
            for await (const chunk of request) {
              legacyChunks.push(
                typeof chunk === "string"
                  ? Buffer.from(chunk)
                  : new Uint8Array(chunk),
              );
            }
          }
          Object.assign(request, {
            query,
            ...(hasLegacyBody
              ? { body: Buffer.concat(legacyChunks) }
              : {}),
          });
          const loaded = (await import(
            pathToFileURL(path.resolve(process.cwd(), modulePath)).href
          )) as {
            default: (
              req: typeof request,
              res: typeof response,
            ) => Promise<void>;
          };
          await loaded.default(request, response);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [localApiPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        exclude: ["src/test/**", "src/vite-env.d.ts"],
      },
    },
  };
});
