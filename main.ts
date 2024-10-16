import { Application } from "jsr:@oak/oak/application";
import ListRouter from "./src/wishlist/routes.ts";

const app = new Application();

app.use((ctx, next) => {
  ctx.response.headers.set('Access-Control-Allow-Origin', '*')
  return next()
})
app.use(ListRouter.routes());

app.listen({ port: 8080 });
