import express from 'express'

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded())

let n = 0;
const users = [];
app.all('/', (req, res, next) => {
    if (['POST', "GET"].includes(req.method)) {
        if (req.method === "POST") {
            users.push(req.body);
        }
        n++;
        res.status(200).render('index', { ip: req.socket.remoteAddress, n, users })
    }
    else next();
})


app.listen(3000, () => console.log("Server listening on port 3000"))