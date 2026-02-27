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
	res.set('Content-Type', 'text/plain; charset=utf-8');
	res.send(`Hits: ${config.fileserverHits}`);
}
async function handlerReset(req: Request, res: Response) {
	config.fileserverHits = 0;
	res.send();	
}
app.get("/reset", handlerReset);
app.get("/metrics", handlerMetrics);
app.get("/healthz", handlerReadiness);
app.use("/app", express.static("./app"));
app.use("/app", express.static("./app/assets"));

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});