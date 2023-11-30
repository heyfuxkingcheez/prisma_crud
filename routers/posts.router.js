import { Router } from 'express';
import { prisma } from '../src/utils/prisma/index.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const postsRouter = Router();

// 게시글 생성 api
postsRouter.post('/posts', authMiddleware, async (req, res, next) => {
    const { userId } = req.user;
    const { title, content } = req.body;
    const post = await prisma.posts.create({
        data: {
            UserId: userId,
            title,
            content,
        },
    });
    return res.status(201).json({ data: post });
});

// 게시글 목록 조회 api
postsRouter.get('/posts', async (req, res, next) => {
    const posts = await prisma.posts.findMany({
        select: {
            postId: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return res.status(200).json({ data: posts });
});

// 게시글 상세 조회 api
postsRouter.get('/posts/:postId', async (req, res, next) => {
    const { postId } = req.params;
    console.log(postId);
    const post = await prisma.posts.findFirst({
        where: {
            postId: +postId,
        },
        select: {
            postId: true,
            title: true,
            content: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return res.status(200).json({ data: post });
});
export { postsRouter };
