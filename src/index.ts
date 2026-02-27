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
		if (status !== 200) {
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
async function handlerMetrics(req: Request, res: Response) {
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
async function handlerValidate(req: Request, res: Response) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk;
	});
	req.on("end", () => {
		try {
			const parsedBody = JSON.parse(body);
			if (!parsedBody.body) {
				throw new Error("Something went wrong");
			}
			if (parsedBody.body.length > 140) {
				throw new Error("Chirp is too long")
			}
			type responseData = {
				valid: boolean,
			}
			const respBody: responseData = {
				valid: true,
			};

			res.header("Content-Type", "application/json");
			res.status(200).send(JSON.stringify(respBody));
		} catch (error) {
			type caught = {
				error: string;
			}
			const resJson: caught = {
				error: "Something went wrong",
			}
			if (error instanceof Error) {
				resJson.error = error.message;
			}
			res.header("Content-Type", "application/json");
			res.status(400).send(JSON.stringify(resJson));
		}
	});

}
app.post("/api/validate_chirp", handlerValidate);
app.post("/admin/reset", handlerReset);
app.get("/admin/metrics", handlerMetrics);
app.get("/api/healthz", handlerReadiness);
app.use("/app", express.static("./app"));
app.use("/app", express.static("./app/assets"));

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});