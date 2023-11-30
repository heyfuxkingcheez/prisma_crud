import { Router } from 'express';
import { prisma } from '../src/utils/prisma/index.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const commentsRouter = Router();

// 댓글 작성 api
commentsRouter.post(
    '/posts/:postId/comments',
    authMiddleware,
    async (req, res, next) => {
        try {
            const postId = req.params;
            const content = req.body;
            const post = await prisma.comments.create({
                where: {
                    postId: +postId,
                },
                data: {
                    content: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            return res.status(200).json({ data: post });
        } catch (err) {
            console.log(err);
        }
    }
);
