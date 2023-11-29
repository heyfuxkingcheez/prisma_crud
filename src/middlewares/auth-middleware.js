import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

const loginMiddleware = async (req, res, next) => {
    try {
        const { authorization } = req.cookies;
        if (!authorization) {
            throw new Error('토큰이 존재하지 않습니다.');
        }
        const [tokenType, token] = authorization.split(' ');
        if (tokenType !== 'Bearer') {
            throw new Error('토큰 타입이 일치하지 않습니다.');
        }

        const decodedToken = jwt.verify(token, 'woogi-secret-key');
        const userId = decodedToken.userId;

        const user = await prisma.users.findFirst({
            where: { userId: +userId },
        });
        if (!user) {
            res.clearCookie('authorization');
            throw new Error('토큰 사용자가 존재하지 않습니다.');
        }

        // req.cookie에 사용자 정보를 저장
        req.user = user;
        next();
    } catch (error) {
        res.clearCookie('authorization');

        // 토큰이 만료되었거나, 조작되었을 때, 에러 메세지를 다르게 출력
        switch (error.name) {
            case 'TokenExpiredError':
                return res.status(401).json({
                    success: false,
                    message: '토큰이 만료되었습니다.',
                });
            case 'JsonWebTokenError':
                return res.status(401).json({
                    success: false,
                    message: '토큰이 조작되었습니다.',
                });
            default:
                return res.status(401).json({
                    success: false,
                    message: error.message ?? `비정상적인 요청입니다.`,
                });
        }
    }
};

export { loginMiddleware };
