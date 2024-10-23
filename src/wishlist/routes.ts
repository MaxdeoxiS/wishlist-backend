import { Router } from "@oak/oak/router";
import { supabase } from "../../supabase.ts";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_SECRET") });

const router = new Router({ prefix: "/list" });

// console.log(Deno.env.get("OPENAI_SECRET"))

// router.get("/bababa", async ({ response }) => {
//     const completion = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//             { role: "user", content: [
//                 {
//                     type: "text", text: "Here is a screenshot of an ecommerce site. Give me a JSON data with two properties: the name of the item, and its price. If you can't find the item nor the price, return an empty json."
//                 },
//                 {
//                     type: "image_url",
//                     image_url: {
//                         // "url": "https://image.noelshack.com/fichiers/2024/43/3/1729709559-screenamazontest.png",
//                         "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
//                     },
//                 }
//             ] },
//         ],
//     });

//     console.log(completion)
//     response.body = completion
// })

router.get("/", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wishes (*)");
    ctx.response.body = data;
});

router.get("/:hash", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wishes(*)").order('created_at', {
        referencedTable: 'wishes',
        ascending: false
    }
    ).eq("hash", ctx.params.hash).maybeSingle();
    if (!data) {
        ctx.response.status = 404
    }
    ctx.response.body = data;
});

router.get("/:hash/wishes/:wishId", async ({ params, response }) => {
    const { hash, wishId } = params;

    const data = await supabase.from("wishes").select("*").eq("id", wishId).maybeSingle()
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

router.post("/wishes", async ({ request, response }) => {
    const { url, name, listId } = await request.body.json();

    const { data, error } = await supabase.from("wishes").insert({
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

router.put("/:hash/wishes/:wishId/toggle", async ({ params, response, request }) => {
    const { hash, wishId } = params;
    const { bought_by } = await request.body.json();

    const wish = await supabase.from("wishes").select("*").eq("id", wishId).maybeSingle()

    if (!wish) {
        response.status = 404
    }

    if (wish.data.bought_by && !wish.data.bought_by !== bought_by) {
        response.status = 403
    }

    try {
        const data = await supabase.from("wishes").update({ bought_by }).eq("id", wishId).select()
        response.body = data;

    } catch (e) {
        console.error(e)
    }
})

router.allowedMethods();

export default router;
