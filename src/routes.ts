import { Router } from "@oak/oak/router";
import {
    addListToGroup,
    createGroup,
    createList,
    createWish,
    deleteWish,
    getGroup,
    getList,
    getPresignedUploadUrl,
    getWish,
    removeListFromGroup,
    updateGroup,
    updateList,
    updateWish,
    uploadFile
} from "./services.ts";

const router = new Router();

router.get("/", ({ response }) => {
    response.body = { status: "ok", message: "Wishlist API is running" };
});

router.get("/health", ({ response }) => {
    response.body = { status: "ok" };
});

router.get("/list/:listId", async ({ params, response }) => {
    const list = await getList(params.listId);

    if (!list) {
        response.status = 404;
    }
    response.body = list;
});

router.get("/list/:listId/wishes/:wishId", async ({ params, response }) => {
    const { listId, wishId } = params;

    const wish = await getWish(listId, wishId);

    if (!wish) {
        response.status = 404;
    }
    response.body = wish;
});

router.post("/list", async ({ request, response }) => {
    const { title, user, groupId } = await request.body.json();

    const list = await createList({ title, user, groupId });

    if (!list) {
        response.status = 500;
    }

    response.body = list;
});

router.put("/list/:listId", async ({ params, request, response }) => {
    try {
        const { listId } = params;
        const body = await request.body.json();
        const { title } = body;

        if (!title || typeof title !== "string" || !title.trim()) {
            response.status = 400;
            response.body = { error: "Le titre de la liste est obligatoire." };
            return;
        }

        const list = await updateList(listId, { title: title.trim() });

        if (!list) {
            response.status = 404;
            response.body = { error: "Liste introuvable." };
            return;
        }

        response.status = 200;
        response.body = list;
    } catch (err: any) {
        console.error("Error updating list:", err);
        response.status = 500;
        response.body = { error: err?.message || "Erreur serveur" };
    }
});

router.post("/list/:listId/wishes", async ({ request, response, params }) => {
    const { url, name, price, comment, picture } = await request.body.json();
    const { listId } = params;

    const wish = await createWish({ url, name, price, picture, comment, listId });

    if (!wish) {
        response.status = 500;
    }
    response.body = wish;
});

router.put(
    "/list/:listId/wishes/:wishId/toggle",
    async ({ params, response, request }) => {
        const { listId, wishId } = params;
        const { bought_by } = await request.body.json();

        const wish = await updateWish(listId, wishId, { bought_by });

        if (!wish) {
            response.status = 500;
        }

        response.body = wish;
    },
);

router.delete("/list/:listId/wishes/:wishId", async ({ params, response }) => {
    const { listId, wishId } = params;

    const deleted = await deleteWish(listId, wishId);

    response.body = deleted;
});

router.post("/list/picture/upload-url", async ({ request, response }) => {
    try {
        const body = await request.body.json();
        const filename = body?.filename || "image.jpg";
        const contentType = body?.contentType || "image/jpeg";

        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename, contentType);

        response.status = 200;
        response.body = { uploadUrl, publicUrl };
    } catch (err: any) {
        console.error("Error generating upload URL:", err);
        response.status = 500;
        response.body = { error: err?.message || "Failed to generate upload URL" };
    }
});

router.post("/list/picture", async ({ request, response }) => {
    try {
        const file = (await request.body.formData()).get("file") as File | null;

        if (!file) {
            response.status = 400;
            response.body = { error: "No file provided" };
            return;
        }

        const fileUrl = await uploadFile(file);

        response.status = 200;
        response.body = { url: fileUrl };
    } catch (err: any) {
        console.error("Error uploading file in /list/picture:", err);
        response.status = 500;
        response.body = { error: err?.message || "Upload failed, please try again." };
    }
});

router.get("/group/:groupId", async ({ params, response }) => {
    const group = await getGroup(params.groupId);

    if (!group) {
        response.status = 404;
    }
    response.body = group;
});

router.post("/group", async ({ request, response }) => {
    try {
        const body = await request.body.json();
        const { title } = body;

        if (!title || typeof title !== "string" || !title.trim()) {
            response.status = 400;
            response.body = { error: "Le titre du groupe est obligatoire." };
            return;
        }

        const group = await createGroup({ title: title.trim() });

        if (!group) {
            response.status = 500;
            response.body = { error: "Impossible de créer le groupe." };
            return;
        }

        response.status = 201;
        response.body = group;
    } catch (err: any) {
        console.error("Error creating group:", err);
        response.status = 500;
        response.body = { error: err?.message || "Erreur serveur" };
    }
});

router.put("/group/:groupId", async ({ params, request, response }) => {
    try {
        const { groupId } = params;
        const body = await request.body.json();
        const { title } = body;

        if (!title || typeof title !== "string" || !title.trim()) {
            response.status = 400;
            response.body = { error: "Le titre du groupe est obligatoire." };
            return;
        }

        const group = await updateGroup(groupId, { title: title.trim() });

        if (!group) {
            response.status = 404;
            response.body = { error: "Groupe introuvable." };
            return;
        }

        response.status = 200;
        response.body = group;
    } catch (err: any) {
        console.error("Error updating group:", err);
        response.status = 500;
        response.body = { error: err?.message || "Erreur serveur" };
    }
});

router.post("/group/:groupId/lists", async ({ params, request, response }) => {
    try {
        const { groupId } = params;
        const body = await request.body.json();
        const rawListId = body?.listId || body?.url;

        if (!rawListId || typeof rawListId !== "string" || !rawListId.trim()) {
            response.status = 400;
            response.body = { error: "L'identifiant ou l'URL de la liste est requis." };
            return;
        }

        const result = await addListToGroup(groupId, rawListId.trim());

        if (result.error) {
            if (result.error === "List not found") {
                response.status = 404;
                response.body = { error: "Liste introuvable avec ce lien ou identifiant." };
            } else if (result.error === "Group not found") {
                response.status = 404;
                response.body = { error: "Groupe introuvable." };
            } else {
                response.status = 500;
                response.body = { error: result.error };
            }
            return;
        }

        response.status = 200;
        response.body = result.data;
    } catch (err: any) {
        console.error("Error adding list to group:", err);
        response.status = 500;
        response.body = { error: err?.message || "Erreur serveur" };
    }
});

router.delete("/group/:groupId/lists/:listId", async ({ params, response }) => {
    try {
        const { groupId, listId } = params;
        const success = await removeListFromGroup(groupId, listId);

        if (!success) {
            response.status = 500;
            response.body = { error: "Impossible de retirer la liste du groupe." };
            return;
        }

        response.status = 200;
        response.body = { success: true };
    } catch (err: any) {
        console.error("Error removing list from group:", err);
        response.status = 500;
        response.body = { error: err?.message || "Erreur serveur" };
    }
});

router.allowedMethods();

export default router;
