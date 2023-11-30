import { Router } from 'express';
import { prisma } from '../src/utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middlewares/auth.middleware.js';

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

        // 생성
        const user = await prisma.Users.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        const userIanfo = await prisma.UserInfos.create({
            data: {
                UserId: user.userId,
                name,
                age,
                gender: gender.toUpperCase(),
                profileImage,
            },
        });

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

    const ACCESS_TOKEN_SECRET_KEY = '1234';
    const REFRESH_TOKEN_SECRET_KEY = '2345';
    // 로그인 성공 시
    // 엑세스 토큰 발급
    const token = jwt.sign(
        {
            userId: user.userId,
        },
        ACCESS_TOKEN_SECRET_KEY,
        { expiresIn: '10m' }
    );
    // 리프래쉬 토큰 발급
    const newRefreshToken = jwt.sign({}, REFRESH_TOKEN_SECRET_KEY, {
        expiresIn: '14d',
    });

    await prisma.Users.updateMany({
        where: { email },
        data: {
            refreshToken: newRefreshToken,
        },
    });

    res.cookie('authorization', `Bearer ${token}`);
    res.cookie('refreshtoken', `RefreshToken ${newRefreshToken}`);
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
export { usersRouter };
