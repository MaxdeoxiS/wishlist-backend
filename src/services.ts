import { randomUUID } from "node:crypto";
import { supabase } from "../supabase.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";


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

const S3_BUCKET = "cmldocuments";
const REGION = "eu-west-3";

function getS3Client() {
    return new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
            secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
        },
    });
}

export async function getPresignedUploadUrl(filename: string, contentType: string) {
    const sanitized = (filename || "image.jpg").replace(/[^a-zA-Z0-9.-]/g, "_").slice(-30);
    const key = `${randomUUID()}_${sanitized}`;
    const s3Client = getS3Client();

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType || "image/jpeg",
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl };
}

export async function uploadFile(file: File) {
    if (!file) {
        console.warn("No file provided for upload.");
        throw new Error("No file to upload.");
    }

    try {
        const fileContent = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(fileContent);
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-30);
        const fileName = `${randomUUID()}_${sanitized}`;

        const s3Client = getS3Client();

        const bucketParams = {
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: fileBuffer,
            ContentType: file.type || "image/jpeg",
        };

        await s3Client.send(new PutObjectCommand(bucketParams));

        return `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error("Error during file upload:", error);
        throw new Error("Upload failed, please try again.");
    }
}
