import { Router } from "@oak/oak/router";
import { createList, createWish, getList, getWish, updateWish, uploadFile } from "./services.ts";

const router = new Router({ prefix: "/list" });

router.get("/:listId", async ({ params, response }) => {
    const list = await getList(params.listId)

    if (!list) {
        response.status = 404;
    }
    response.body = list;
});

router.get("/:listId/wishes/:wishId", async ({ params, response }) => {
    const { listId, wishId } = params;

    const wish = await getWish(listId, wishId);

    if (!wish) {
        response.status = 404;
    }
    response.body = wish;
});

router.post("/", async ({ request, response }) => {
    const { title, user } = await request.body.json();

    const list = await createList({ title, user })

    if (!list) {
        response.status = 500;
    }

    response.body = list;
});

router.post("/:listId/wishes", async ({ request, response, params }) => {
    const { url, name, price, comment, picture } = await request.body.json();
    const { listId } = params;

    const wish = await createWish({ url, name, price, picture, comment, listId })

    if (!wish) {
        response.status = 500;
    }
    response.body = wish;
});

router.put(
    "/:listId/wishes/:wishId/toggle",
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

router.post("/picture", async ({ request, response }) => {
    const file = (await request.body.formData()).get("file") as File | null;

    if (!file) {
        response.status = 402
        return
    }

    const fileUrl = await uploadFile(file)

    response.body = { url: fileUrl }
})

router.allowedMethods();

export default router;
