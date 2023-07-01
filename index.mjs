import express from 'express'

const app = express();

app.set('view engine', 'ejs');
let n = 0;

app.all('/', (req, res, next) => {
    if (['POST', "GET"].includes(req.method)) {
        n++;
        res.status(200).render('index', { ip: req.socket.remoteAddress, n })
    }
    else next();
})




app.listen(3000, () => console.log("Server listening on port 3000"))