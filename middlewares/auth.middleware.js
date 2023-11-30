// src/middlewares/auth.middleware.js

import jwt from 'jsonwebtoken';
import { prisma } from '../src/utils/prisma/index.js';

const ACCESS_TOKEN_SECRET_KEY = '1234';
const REFRESH_TOKEN_SECRET_KEY = '2345';

const authMiddleware = async function (req, res, next) {
    try {
        const { authorization, refreshtoken } = req.cookies;
        if (!authorization) {
            return res.status(400).json({
                success: false,
                message: '로그인 후 이용 가능합니다.',
            });
        }

        const [accessType, access] = authorization.split(' ');
        const [RefreshType, refresh] = refreshtoken.split(' ');

        const isAccessTokenValidate = validateAccessToken(access);

        if (!isAccessTokenValidate) {
            const accessTokenId = await prisma.Users.findFirst({
                where: { refreshToken: refreshtoken },
            });

            if (!accessTokenId)
                return res.status(419).json({
                    success: true,
                    message: 'Access Token정보가 존재하지 않습니다.',
                });
        }

        if (accessType !== 'Bearer')
            throw new Error('토큰 타입이 일치하지 않습니다.');

        const decodedToken = jwt.verify(access, ACCESS_TOKEN_SECRET_KEY);
        const userId = decodedToken.userId;

        const user = await prisma.users.findFirst({
            where: { userId: +userId },
        });
        if (!user) {
            res.clearCookie('authorization');
            throw new Error('토큰 사용자가 존재하지 않습니다.');
        }

        // req.user에 사용자 정보를 저장합니다.
        req.user = user;

        next();
    } catch (error) {
        res.clearCookie('authorization');

        // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
        switch (error.name) {
            case 'TokenExpiredError':
                return res
                    .status(401)
                    .json({ message: '토큰이 만료되었습니다.' });
            case 'JsonWebTokenError':
                return res
                    .status(401)
                    .json({ message: '토큰이 조작되었습니다.' });
            default:
                return res.status(401).json({
                    message: error.message ?? '비정상적인 요청입니다.',
                });
        }
    }
};

//------------------------------------------------
function validateAccessToken(accesstoken) {
    try {
        jwt.verify(accesstoken, ACCESS_TOKEN_SECRET_KEY);
        return true;
    } catch (error) {
        return false;
    }
}

function validateRefreshToken(refreshtoken) {
    try {
        jwt.verify(refreshtoken, REFRESH_TOKEN_SECRET_KEY);
        return true;
    } catch (error) {
        return false;
    }
}

export { authMiddleware };
