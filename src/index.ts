import express, { NextFunction } from "express";
import { Request, Response } from "express";
import { config } from "./config.js";

const app = express();
const PORT = 8080;

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
	config.fileserverHits++;
	next();
}

function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
	res.on("finish", () => {
		const status = res.statusCode;
		if(status !== 200){
			console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${status}`);
		}
	});
	next();	
}
app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc);
async function handlerReadiness(req: Request, res: Response) {
	res.set('Content-Type', 'text/plain; charset=utf-8');
	res.send("OK");
}
async function handlerMetrics(req: Request, res: Response){
	res.set('Content-Type', 'text/html; charset=utf-8');
	res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`);
}
async function handlerReset(req: Request, res: Response) {
	config.fileserverHits = 0;
	res.send();	
}

app.post("/admin/reset", handlerReset);
app.get("/admin/metrics", handlerMetrics);
app.get("/api/healthz", handlerReadiness);
app.use("/app", express.static("./app"));
app.use("/app", express.static("./app/assets"));

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});