import AWS from "aws-sdk";
import { randomUUID } from "node:crypto";
import { supabase } from "../supabase.ts";

export async function getList(id: string) {
    const { data, error } = await supabase.from("list").select("*, wishes(*)").order(
        "bought_by",
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

export async function getGroup(id: string) {
    const { data, error } = await supabase.from("group").select("*, list(*)").order(
        "created_at",
        {
            referencedTable: "list",
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

export async function createList({ title, user, groupId }: { title: string; user: string; groupId?: string; }) {
    const { data, error } = await supabase.from("list").insert({
        user,
        title,
        groupId,
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

export async function deleteWish(listId: string, wishId: string) {
    const { data, error } = await supabase.from("wishes").delete().eq("listId", listId).eq(
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

// export async function getWishInfosFromUrl(url: string) {
//     const browser = await launch();

//     const page = await browser.newPage(url);

//     await page.setViewportSize({ width: 400, height: 800 });

//     // const html = await page.content()

//     // COMMON
//     const title = await page.evaluate(() => document.title)

//     //IF AMAZON
//     const price = await page.evaluate(() => {
//         return (document.getElementById("items[0.base][customerVisiblePrice][amount]") as HTMLInputElement | null)?.value
//     })
//     const data = { title, price }

//     // ELSE
//     // const screenshot = await page.screenshot();
//     // Deno.writeFileSync("screenshot.png", screenshot);
//     // TODO: send screenshot to open ai
//     // Close the browser
//     await browser.close();

//     return data
// }

// export async function getWishInfosFromScreenshot(url: string) {
//     const completion = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//             {
//                 role: "user", content: [
//                     {
//                         type: "text", text: "Here is a screenshot of an ecommerce site. Give me a JSON data with two properties: the name of the item, and its price. If you can't find the item nor the price, return an empty json."
//                     },
//                     {
//                         type: "image_url",
//                         image_url: {
//                             url
//                             // "url": "https://image.noelshack.com/fichiers/2024/43/3/1729709559-screenamazontest.png",
//                             // "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
//                         },
//                     }
//                 ]
//             },
//         ],
//     });

//     return completion
// }