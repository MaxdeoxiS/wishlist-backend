import { Application } from "jsr:@oak/oak/application";
import ListRouter from "./src/routes.ts";

const app = new Application();

app.use((ctx, next) => {
  const { request, response } = ctx;

  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    response.status = 204; // No Content
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return;
  }

  // Add CORS headers for actual requests
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return next();
})
app.use(ListRouter.routes());

app.listen({ port: 8080 });
