import express, { application, NextFunction } from "express";
import { Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from "./errorClasses.js";
import { createUserByEmail, deleteUsers } from "./db/queries/users.js";
import { createChirp } from "./db/queries/chirps.js";


const app = express();
const PORT = 8080;

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
	console.log(`${err.name}: ${err.message}`);
	let status = 500;
	if (err instanceof BadRequestError) {
		status = 400;
	} else if (err instanceof UnauthorizedError) {
		status = 401;
	} else if (err instanceof ForbiddenError) {
		status = 403;
	} else if (err instanceof NotFoundError) {
		status = 404;
	} else {
		status = 500;
	}
	res.status(status).json({
		error: err.message,
	});
}

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
	config.api.fileserverHits++;
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
app.use(express.json());
app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc);
async function handlerReadiness(req: Request, res: Response) {
	res.set('Content-Type', 'text/plain; charset=utf-8');
	res.send("OK");
}
function handlerMetrics(req: Request, res: Response) {
	res.set('Content-Type', 'text/html; charset=utf-8');
	res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>`);
}
async function handlerReset(req: Request, res: Response, next: NextFunction) {
	try {
		if (config.api.platform !== "dev") {
			throw new ForbiddenError("You're not authorized!");
		}
		await deleteUsers();
		res.status(200).send();
	} catch (err) {
		next(err);
	}
}
async function handlerChirps(req: Request, res: Response, next: NextFunction) {
	try {
		const parsedBody = req.body;
		if (!parsedBody.body || !parsedBody.userId) {
			throw new BadRequestError("Something went wrong");
		}
		if (parsedBody.body.length > 140) {
			throw new BadRequestError("Chirp is too long. Max length is 140")
		}
		const cleanedBody = cleanBody(parsedBody.body);
		const chirp = await createChirp(cleanedBody, parsedBody.userId);
		res.header("Content-Type", "application/json");
		res.status(201).send(JSON.stringify(chirp));
	} catch (err) {
		next(err);
	}
}
async function handlerUsers(req: Request, res: Response, next: NextFunction) {
	try {
		const parsedBody = req.body;
		if (!parsedBody.email) {
			throw new BadRequestError("Something went wrong");
		}
		const user = await createUserByEmail(parsedBody.email);
		res.header("Content-Type", "application/json");
		res.status(201).send(JSON.stringify(user));
	}
	catch (err) {
		next(err);
	}
}

app.post("/api/users", handlerUsers)
app.post("/api/chirps", handlerChirps);
app.post("/admin/reset", handlerReset);
app.get("/admin/metrics", handlerMetrics);
app.get("/api/healthz", handlerReadiness);
app.use("/app", express.static("./app"));
app.use("/app", express.static("./app/assets"));

app.use(errorHandler);
app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});

function cleanBody(bodyStr: string): string {
	const bannedWords = ["kerfuffle", "sharbert", "fornax"];
	const words = bodyStr
		.split(" ");
	for (const i in words) {
		if (bannedWords.includes(words[i].toLowerCase())) {
			words[i] = "****";
		}
	}
	return words.join(" ");
}