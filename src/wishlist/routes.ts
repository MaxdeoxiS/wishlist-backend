import { Router } from "@oak/oak/router";
import { supabase } from "../../supabase.ts";
import OpenAI from "openai";
import { launch } from "jsr:@astral/astral";
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

router.get("/test", async ({ response }) => {

    const browser = await launch();

    const page = await browser.newPage("https://www.amazon.fr/Asmodee-Play-Punk-Captain-Flip/dp/B0CY63P4PB/?_encoding=UTF8&pd_rd_w=k2OEa&content-id=amzn1.sym.c6c714d0-70b2-4898-816f-f82a0c2b0af5%3Aamzn1.symc.9c69961c-776f-45c4-b797-9eea1239a3fb&pf_rd_p=c6c714d0-70b2-4898-816f-f82a0c2b0af5&pf_rd_r=FY6PS64ZA4WWPH15CYC4&pd_rd_wg=em1Xu&pd_rd_r=19e894be-704f-46cd-bcad-a831b3ff4c02&ref_=pd_hp_d_atf_ci_mcx_mr_ca_hp_atf_d",);

    await page.setViewportSize({ width: 400, height: 800 })

    // const html = await page.content()

    // COMMON
    // const title = await page.evaluate(() => document.title)

    //IF AMAZON
    // const price = await page.evaluate(() => {
    // return document.getElementById("items[0.base][customerVisiblePrice][amount]").value
    //    return  document.querySelector('[class="a-price-whole"]')?.textContent + document.querySelector('[class="a-price-fraction"]')?.textContent
    // })
    // const data = {title, price}

    // ELSE
    const screenshot = await page.screenshot();
    Deno.writeFileSync("screenshot.png", screenshot);
    // Close the browser
    await browser.close();
    response.body = "ok"
})

router.get("/", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wishes (*)");
    ctx.response.body = data;
});

router.get("/:hash", async (ctx) => {
    const { data } = await supabase.from("list").select("*, wishes(*)").order('created_at', {
        referencedTable: 'wishes',
        ascending: false
    }
    ).eq("id", ctx.params.hash).maybeSingle();

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

    const { data, error } = await supabase.from("list").insert({
        user,
        title,
    }).select("*").single();
    if (error) {
        response.body = error
        console.error(error);
        return
    }
    response.body = data;
});

router.post("/:hash/wishes", async ({ request, response, params }) => {
    const { url, name, price, comment } = await request.body.json();
    const { hash } = params;

    const { data, error } = await supabase.from("wishes").insert({
        url,
        name,
        price,
        comment,
        listId: hash,
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

    try {
        const data = await supabase.from("wishes").update({ bought_by }).eq("id", wishId).select()
        response.body = data;

    } catch (e) {
        console.error(e)
    }
})

router.allowedMethods();

export default router;
