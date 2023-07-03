import express from 'express'
import { readFile, writeFile } from 'fs/promises'

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded())

let n = 0;


app.all('/', async (req, res, next) => {
    if (['POST', "GET"].includes(req.method)) {
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
        if (req.method === "POST") {
            // readFile('users.json')
            //     .catch(x => { writeFile('users.json', '[]'); return []; })
            //     .then(file => JSON.parse(file))
            //     .then(res => {
            //         console.log(res.concat(req.body))
            //     })
            users = users.concat(req.body)
            writeFile('users.json', JSON.stringify(users))
            // users.push(req.body);
        }
        n++;
        res.status(200).render('index', { ip: req.socket.remoteAddress, n, users })
    }
    else next();
})

app.use('/static', express.static('static'))


app.listen(3000, () => console.log("Server listening on port 3000"))