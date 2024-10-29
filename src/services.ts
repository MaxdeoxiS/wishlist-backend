/// <reference lib="dom" />
import AWS from "aws-sdk";
import { supabase } from "../supabase.ts";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { launch } from "jsr:@astral/astral";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_SECRET") });

export async function getList(id: string) {
    const { data, error } = await supabase.from("list").select("*, wishes(*)").order(
        "created_at",
        {
            referencedTable: "wishes",
            ascending: false,
        },
    ).eq("id", id).maybeSingle();

    if (error) {
        console.error(error)
        return null
    }

    return data;
}

export async function getWish(listId: string, id: string) {
    const { data: wish, error } = await supabase.from("wishes").select("*").eq("listId", listId).eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(error)
        return null
    }

    return wish;
}

export async function createList({ title, user }: { title: string; user: string }) {
    const { data, error } = await supabase.from("list").insert({
        user,
        title,
    }).select("*").single();

    if (error) {
        console.error(error)
        return null
    }

    return data;
}

export async function createWish({ url, name, price, comment, listId, picture }: { url?: string, name: string, price: number, comment?: string, listId: string, picture?: string }) {
    const { data, error } = await supabase.from("wishes").insert({
        url,
        name,
        price,
        comment,
        picture,
        listId,
    }).select();

    if (error) {
        console.error(error)
        return null
    }

    return data;
}

export async function updateWish(listId: string, wishId: string, body: {
    bought_by?: string | null
    comment?: string | null
    created_at?: string
    name?: string | null
    picture?: string | null
    price?: number | null
    url?: string | null
}) {
    const { data, error } = await supabase.from("wishes").update(body).eq("listId", listId).eq(
        "id",
        wishId,
    ).select();

    if (error) {
        console.error(error)
        return null
    }

    return data
}

export async function uploadFile(file: File) {
    const S3_BUCKET = "cmldocuments";
    const REGION = "eu-west-3";

    AWS.config.update({
        accessKeyId: "youraccesskeyhere",
        secretAccessKey: "yoursecretaccesskeyhere",
    });

    const s3 = new AWS.S3({
        params: { Bucket: S3_BUCKET },
        region: REGION,
        credentials: {
            accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
            secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
        },
    });

    if (file) {
        const fileContent = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(fileContent);
        const fileName = `${randomUUID()}_${file.name.replace(" ", "-").slice(-30)}`;

        const params = {
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: fileBuffer,
            ContentType: file.type,
        };

        const upload = s3
            .putObject(params)
            .on("httpUploadProgress", (evt) => {
                console.log(
                    "Uploading " + (evt.loaded * 100) / evt.total +
                    "%",
                );
            }).promise()

        const res = await upload;
        if (res) {
            return `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
        }
    }
}

export async function getWishInfosFromUrl(url: string) {
    const browser = await launch();

    const page = await browser.newPage(url
        // "https://www.amazon.fr/Asmodee-Play-Punk-Captain-Flip/dp/B0CY63P4PB/?_encoding=UTF8&pd_rd_w=k2OEa&content-id=amzn1.sym.c6c714d0-70b2-4898-816f-f82a0c2b0af5%3Aamzn1.symc.9c69961c-776f-45c4-b797-9eea1239a3fb&pf_rd_p=c6c714d0-70b2-4898-816f-f82a0c2b0af5&pf_rd_r=FY6PS64ZA4WWPH15CYC4&pd_rd_wg=em1Xu&pd_rd_r=19e894be-704f-46cd-bcad-a831b3ff4c02&ref_=pd_hp_d_atf_ci_mcx_mr_ca_hp_atf_d",
    );

    await page.setViewportSize({ width: 400, height: 800 });

    // const html = await page.content()

    // COMMON
    const title = await page.evaluate(() => document.title)

    //IF AMAZON
    const price = await page.evaluate(() => {
        return (document.getElementById("items[0.base][customerVisiblePrice][amount]") as HTMLInputElement | null)?.value
        //    return  document.querySelector('[class="a-price-whole"]')?.textContent + document.querySelector('[class="a-price-fraction"]')?.textContent
    })
    const data = { title, price }

    // ELSE
    // const screenshot = await page.screenshot();
    // Deno.writeFileSync("screenshot.png", screenshot);
    // TODO: send screenshot to open ai
    // Close the browser
    await browser.close();

    return data
}

export async function getWishInfosFromScreenshot(url: string) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user", content: [
                    {
                        type: "text", text: "Here is a screenshot of an ecommerce site. Give me a JSON data with two properties: the name of the item, and its price. If you can't find the item nor the price, return an empty json."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url
                            // "url": "https://image.noelshack.com/fichiers/2024/43/3/1729709559-screenamazontest.png",
                            // "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
                        },
                    }
                ]
            },
        ],
    });

    return completion
}