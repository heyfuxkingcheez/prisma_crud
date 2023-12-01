import express from 'express';
import expressSession from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import cookieParser from 'cookie-parser';
import { usersRouter } from '../routers/users.router.js';
import logMiddleware from '../middlewares/log.middleware.js';
import errorHandlingMiddleware from '../middlewares/error-handling.middleware.js';
import { postsRouter } from '../routers/posts.router.js';
import { commentsRouter } from '../routers/comments.router.js';
import dotenv from 'dotenv';

//.env에 있는 여러 값들을, process.env 객체 안에 추가하게 된다.
dotenv.config();

const app = express();
const PORT = 3018;

const MySQLStorage = expressMySQLSession(expressSession);
const sessionStore = new MySQLStorage({
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    expiration: 1000 * 60 * 60 * 24,
    createDatabaseTable: true,
});

app.use(logMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(
    expressSession({
        secret: process.env.SESSION_SECRET_KEY, // 세션을 암호화하는 비밀 키를 설정
        resave: false, // 클라이언트의 요청이 올 때마다 세션을 새롭게 저장할 지 설정, 변경사항이 없어도 다시 저장
        saveUninitialized: false, // 세션이 초기화되지 않았을 때 세션을 저장할 지 설정
        store: sessionStore,
        cookie: {
            // 세션 쿠키 설정
            maxAge: 1000 * 60 * 60 * 24, // 쿠키의 만료 기간을 1일로 설정합니다.
        },
    })
);
app.use('/api', [usersRouter, postsRouter, commentsRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
    console.log(PORT, '포트로 서버가 열렸어요!');
});
