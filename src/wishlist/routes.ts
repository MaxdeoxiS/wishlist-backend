import { Router } from "@oak/oak/router";
import { supabase } from "../../supabase.ts";

const router = new Router({ prefix: "/list" });

router.get("/", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wish (*)");
    ctx.response.body = data;
});

router.post("/", async ({request, response}) => {
    const { title, user } = await request.body.json();

    const hash = crypto.randomUUID();
    const { data, error } = await supabase.from("list").insert({
        user,
        hash,
        title,
    }).select();
    if (error) {
        response.body = error
        console.error(error);
        return
    }
    response.body = data;
});

router.post("/wish", async ({request, response}) => {
    const { url, name, listId } = await request.body.json();

    const { data, error } = await supabase.from("wish").insert({
        url,
        name,
        listId,
    }).select();
    if (error) {
        response.body = error
        console.error(error);
        return
    }
    response.body = data;
})

router.allowedMethods();

export default router;
