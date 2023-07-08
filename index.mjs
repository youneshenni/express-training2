import { compareSync, genSaltSync, hashSync } from 'bcrypt';
import express from 'express'
import { readFile, writeFile } from 'fs/promises'
const pepper = "PEPPER";

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded())

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

let n = 0;


app.all('/', async (req, res, next) => {
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

app.get('/login', (req, res) => res.status(200).render('login', { error: false }))
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await getUsers();
    const currentUser = users.find(({ username: foundUsername }) => foundUsername === username);
    if (currentUser === undefined || hashSync(password, currentUser.salt + pepper) !== currentUser.password) res.status(404).render('login', { error: true })
    else res.status(200).redirect('/')
})

app.get('/register', (req, res) => res.status(200).sendFile('pages/register.html', { root: '.' }))
app.post('/register', async (req, res) => {
    const salt = genSaltSync();
    const hashedPassword = hashSync(req.body.password, salt + pepper);
    writeUser({ ...req.body, password: hashedPassword, salt })

})

app.use('/static', express.static('static'))


app.listen(3000, () => console.log("Server listening on port 3000"))