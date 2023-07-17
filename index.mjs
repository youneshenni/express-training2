import { compareSync, genSaltSync, hashSync } from 'bcrypt';
import cookieParser from 'cookie-parser';
import express from 'express'
import { readFile, writeFile } from 'fs/promises'
import jwt from 'jsonwebtoken'
import morgan from 'morgan';
import fs from 'fs';
import path from 'path'
import winston from 'winston';

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const pepper = "PEPPER";
const secret = "SECRET";

const app = express();

app.set('view engine', 'ejs');

async function getUsers() {
    let users = [];
    try {
        users = JSON.parse(await readFile('./users.json'))
    } catch (e) {
        console.error(e.code)
        if (e.code === "ENOENT") {
            await writeFile("users.json", "[]");
            users = [];
        }
        else {
            console.error(`Uncaught exception: ${e.code}`);
            console.error(e)
            process.exit(-1)
        }
    }
    return users;
}

async function writeUser(user) {
    const users = await getUsers();
    return writeFile('users.json', JSON.stringify(users.concat(user)))
}

app.use(cookieParser())

let n = 0;



const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: accessLogStream }))

function isAuthenticated(req, res, next) {
    try {
        const { isConnected } = jwt.verify(req.cookies.jwt, secret);
        if (isConnected) next();
        else res.redirect('/login');
    } catch (e) {
        res.redirect('/login');
        logger.log('info', e)
    }
}

function isNotAuthenticated(req, res, next) {
    try {
        const { isConnected } = jwt.verify(req.cookies.jwt, secret);
        if (isConnected) res.redirect('/');
        else next();
    } catch (e) {
        logger.log('info', e)
        next();
    }
}

app.all('/', isAuthenticated, express.urlencoded(), async (req, res, next) => {
    if (['POST', "GET"].includes(req.method)) {
        const users = await getUsers();
        if (req.method === "POST") {
            await writeUser(req.body);
        }
        n++;
        res.status(200).render('index', { ip: req.socket.remoteAddress, n, users })
    }
    else next();
})

app.get('/login', isNotAuthenticated, (req, res) => res.status(200).render('login', { error: false, success: false }))
app.post('/login', isNotAuthenticated, express.json(), async (req, res) => {
    const { username, password } = req.body;
    const users = await getUsers();
    const currentUser = users.find(({ username: foundUsername }) => foundUsername === username);

    if (currentUser === undefined || hashSync(password, currentUser.salt + pepper) !== currentUser.password) res.status(404).render('login', { error: true, success: false })
    else {
        res.cookie('jwt', jwt.sign({ isConnected: true }, secret, {
            expiresIn: "5m",
        }));
        res.cookie('refresh', jwt.sign({ isConnected: true }, secret, {
            expiresIn: "1d",
        }));
        res.status(200).send("Success")
    }
})

app.get('/register', isNotAuthenticated, (req, res) => res.status(200).sendFile('pages/register.html', { root: '.' }))
app.post('/register', isNotAuthenticated, express.urlencoded(), async (req, res) => {
    const salt = genSaltSync();
    const hashedPassword = hashSync(req.body.password, salt + pepper);
    writeUser({ ...req.body, password: hashedPassword, salt })
    res.status(200).redirect('/login')
})

app.post('/logout', isAuthenticated, (req, res) => {
    console.log("Logging out...")
    res.clearCookie('jwt');
    res.status(200).redirect('/login')
});

app.get('/users', isAuthenticated, async (req, res) => {
    const users = await getUsers();
    res.status(200).json(users)
});

app.post('/user', isAuthenticated, express.json(), async (req, res) => {
    const user = req.body;
    await writeUser(user);
    res.status(200).send("Success")
})

app.put('/user/:username', isAuthenticated, express.json(), async (req, res) => {
    const { username } = req.params;
    const user = req.body;
    const users = await getUsers();
    const index = users.findIndex(({ username: foundUsername }) => foundUsername === username);
    if (index === -1) res.status(404).send("Not found")
    else {
        users[index] = user;
        await writeFile('users.json', JSON.stringify(users))
        res.status(200).send("Success")
    }
})

app.use('/static', express.static('static'))

app.post('/refresh', (req, res) => {
    const { refresh } = req.cookies;
    try {
        const { isConnected } = jwt.verify(refresh, secret);
        if (isConnected) {
            res.cookie('jwt', jwt.sign({ isConnected: true }, secret, {
                expiresIn: "5m",
            }));
            res.cookie('refresh', jwt.sign({ isConnected: true }, secret, {
                expiresIn: "1d",
            }));
            res.status(200).send("Success")
        }
        else res.status(404).send("Not found")
    } catch (e) {
        res.status(404).send("Not found")
    }
});


app.listen(3000, () => console.log("Server listening on port 3000"))