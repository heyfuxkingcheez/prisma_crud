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
            const { userId } = req.user;
            const { postId } = req.params;
            const { content } = req.body;

            const post = await prisma.posts.findFirst({
                where: { postId: +postId },
            });
            if (!post) {
                return res
                    .status(404)
                    .json({ message: '해당 게시글이 존재하지 않습니다.' });
            }

            const comment = await prisma.comments.create({
                data: {
                    content,
                    Post: {
                        connect: { postId: +postId },
                    },
                    User: {
                        connect: { serId: +userId },
                    },
                },
            });

            return res.status(200).json({ data: comment });
        } catch (err) {
            console.log(err);
        }
    }
);

commentsRouter.get('/posts/:postId/comments', async (req, res, next) => {
    const { postId } = req.params;

    const post = await prisma.posts.findFirst({
        where: { postId: +postId },
    });

    if (!post) {
        return res
            .status(404)
            .json({ message: '해당 게시글이 존재하지 않습니다.' });
    }

    const comments = await prisma.comments.findMany({
        where: { PostId: +postId },
        orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ data: comments });
});

export { commentsRouter };
