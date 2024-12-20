import { Router } from "@oak/oak/router";
import { createList, createWish, deleteWish, getGroup, getList, getWish, updateWish, uploadFile } from "./services.ts";

const router = new Router();

router.get("/list/:listId", async ({ params, response }) => {
    const list = await getList(params.listId)

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

    const list = await createList({ title, user, groupId })

    if (!list) {
        response.status = 500;
    }

    response.body = list;
});

router.post("/list/:listId/wishes", async ({ request, response, params }) => {
    const { url, name, price, comment, picture } = await request.body.json();
    const { listId } = params;

    const wish = await createWish({ url, name, price, picture, comment, listId })

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

        const wish = await updateWish(listId, wishId, { bought_by })

        if (!wish) {
            response.status = 500;
        }

        response.body = wish;
    },
);

router.delete("/list/:listId/wishes/:wishId", async ({params, response}) => {
    const { listId, wishId } = params;

    const deleted = await deleteWish(listId, wishId)

    response.body = deleted
})

router.post("/list/picture", async ({ request, response }) => {
    const file = (await request.body.formData()).get("file") as File | null;

    if (!file) {
        response.status = 402
        return
    }

    const fileUrl = await uploadFile(file)

    response.body = { url: fileUrl }
})

router.get("/group/:groupId", async ({params, response}) => {
    const group = await getGroup(params.groupId)

    if (!group) {
        response.status = 404;
    }
    response.body = group; 
})

router.allowedMethods();

export default router;
