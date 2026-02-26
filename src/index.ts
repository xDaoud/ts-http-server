import express from "express";
import { Request, Response } from "express";

const app = express();
const PORT = 8080;

function handlerReadiness(req: Request, res: Response){
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send("OK")
}
app.get("/healthz", handlerReadiness);
app.use("/app", express.static("./app"));
app.use("/app", express.static("./app/assets"));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});