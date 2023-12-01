import { Router } from 'express';
import { prisma } from '../src/utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';

const usersRouter = Router();
// 회원가입 api
usersRouter.post('/sign-up', async (req, res, next) => {
    try {
        const { email, password, name, age, gender, profileImage } = req.body;

        // 중복 검사
        const isExistUser = await prisma.Users.findFirst({
            where: { email },
        });
        if (isExistUser) {
            return res.status(409).json({
                success: false,
                message: '이미 존재하는 이메일  입니다.',
            });
        }
        // bcrypt 암호화
        const hashedPassword = await bcrypt.hash(password, 8);

        const { user, userInfo } = await prisma.$transaction(
            async (tx) => {
                // 생성
                const user = await tx.Users.create({
                    data: {
                        email,
                        password: hashedPassword,
                    },
                });
                const userInfo = await tx.UserInfos.create({
                    data: {
                        UserId: user.userId,
                        name,
                        age,
                        gender: gender.toUpperCase(),
                        profileImage,
                    },
                });
                return [user, userInfo];
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
        );

        return res
            .status(200)
            .json({ success: true, message: '회원가입 성공' });
    } catch (err) {
        next(err);
    }
});

// 로그인 api
usersRouter.post('/sign-in', async (req, res, next) => {
    const { email, password } = req.body;
    console.log(password);
    const user = await prisma.Users.findFirst({ where: { email } });
    if (!user) {
        return res
            .status(401)
            .json({ success: false, message: '존재하지 않는 이메일 입니다.' });
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) {
        return res
            .status(401)
            .json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    //로그인 성공
    req.session.userId = user.userId;

    return res.status(200).json({ success: true, message: '로그인 성공' });
});

// 사용자 조회 api
usersRouter.get('/users', authMiddleware, async (req, res, next) => {
    const { userId } = req.user;

    const user = await prisma.Users.findFirst({
        where: { userId: +userId },
        select: {
            userId: true,
            email: true,
            refreshToken: true,
            createdAt: true,
            updatedAt: true,
            UserInfos: {
                select: {
                    name: true,
                    age: true,
                    gender: true,
                    profileImage: true,
                },
            },
        },
    });

    return res.status(200).json({ data: user });
});

// 사용자 정보 수정 api
usersRouter.patch('/users', authMiddleware, async (req, res, next) => {
    const { userId } = req.user;
    const updatedData = req.body;
    const userInfo = await prisma.userInfos.findFirst({
        where: { UserId: +userId },
    });

    await prisma.$transaction(
        async (tx) => {
            await tx.userInfos.update({
                data: {
                    ...updatedData,
                },
                where: { UserId: +userId },
            });

            for (let key in updatedData) {
                if (userInfo[key] !== updatedData[key]) {
                    await tx.userHistories.create({
                        data: {
                            UserId: +userId,
                            changedField: key,
                            oldValue: String(userInfo[key]), // 변경 전 데이터
                            newValue: String(updatedData[key]), // 변경 후 데이터
                        },
                    });
                }
            }
        },
        {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
    );

    return res.status(200).json({ message: '사용자 정보 변경 성공!' });
});
export { usersRouter };
