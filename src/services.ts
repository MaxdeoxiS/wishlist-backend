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

    const s3 = new AWS.S3({
        region: REGION,
        credentials: {
            accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
            secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
        },
    });

    const fileContent = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(fileContent);
    const fileName = `${randomUUID()}_${file.name.replace(" ", "-").slice(-30)}`;
    
    const uploadParams = {
        Bucket: S3_BUCKET,
        Key: fileName,
        ContentType: file.type,
    };

    const multipartUpload = await s3.createMultipartUpload(uploadParams).promise();
    const uploadId = multipartUpload.UploadId;
    
    try {
        const chunkSize = 5 * 1024 * 1024; // 5 MB chunks
        const numParts = Math.ceil(fileBuffer.length / chunkSize);
        const uploadPromises = [];

        for (let i = 0; i < numParts; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, fileBuffer.length);
            const partParams = {
                ...uploadParams,
                PartNumber: i + 1,
                UploadId: uploadId as string,
                Body: fileBuffer.slice(start, end),
            };

            uploadPromises.push(s3.uploadPart(partParams).promise());
        }

        const uploadedParts = await Promise.all(uploadPromises);
        const completeParams = {
            ...uploadParams,
            UploadId: uploadId as string,
            MultipartUpload: {
                Parts: uploadedParts.map((part, index) => ({
                    ETag: part.ETag,
                    PartNumber: index + 1,
                })),
            },
        };

        await s3.completeMultipartUpload(completeParams).promise();

        return `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        await s3.abortMultipartUpload({ ...uploadParams, UploadId: uploadId as string }).promise();
        console.error("Multipart upload failed:", error);
        throw new Error("Upload failed, please try again.");
    }
}

