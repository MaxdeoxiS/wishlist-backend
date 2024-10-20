import { Router } from "@oak/oak/router";
import { supabase } from "../../supabase.ts";

const router = new Router({ prefix: "/list" });

router.get("/", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wish (*)");
    ctx.response.body = data;
});

router.get("/:hash", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wish(*)").eq("hash", ctx.params.hash).maybeSingle();
    if (!data) {
        ctx.response.status = 404
    }
    ctx.response.body = data;
});

router.get("/:hash/wish/:wishId", async ({ params, response }) => {
    const { hash, wishId } = params;

    const data = await supabase.from("wish").select("*").eq("id", wishId).maybeSingle()
    if (!data) {
        response.status = 404
    }
    response.body = data;
})

router.post("/", async ({ request, response }) => {
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

router.post("/wish", async ({ request, response }) => {
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

router.put("/:hash/wish/:wishId/toggle", async ({ params, response, request }) => {
    const { hash, wishId } = params;
    const { bought_by } = await request.body.json();

    const wish = await supabase.from("wish").select("*").eq("id", wishId).maybeSingle()

    if (!wish) {
        response.status = 404
    }

    if (wish.data.bought_by && !wish.data.bought_by !== bought_by) {
        response.status = 403
    }

    try {
        const data = await supabase.from("wish").update({ bought_by }).eq("id", wishId).select()
        response.body = data;

    } catch (e) {
        console.error(e)
    }

})

router.allowedMethods();

export default router;
