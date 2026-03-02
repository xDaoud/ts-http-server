import express, { application, NextFunction } from "express";
import { Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from "./errorClasses.js";
import { createUserByEmail, deleteUsers, getUserByEmail, updateEmailAndPassword } from "./db/queries/users.js";
import { createChirp, deleteChirpById, getAllChirps, getChirpById } from "./db/queries/chirps.js";
import { checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT } from "./auth.js";
import { UserResponse } from "./db/schema.js";
import { createRefreshToken, getRefreshToken, updateRefreshTokenRevocationDate } from "./db/queries/refreshTokens.js";


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
		if (!parsedBody.body) {
			throw new BadRequestError("Something went wrong");
		}
		if (parsedBody.body.length > 140) {
			throw new BadRequestError("Chirp is too long. Max length is 140")
		}
		const bearerToken = getBearerToken(req);
		const jwtSub = validateJWT(bearerToken, config.secret);
		const cleanedBody = cleanBody(parsedBody.body);
		const chirp = await createChirp(cleanedBody, jwtSub);
		res.header("Content-Type", "application/json");
		res.status(201).send(JSON.stringify(chirp));
	} catch (err) {
		next(err);
	}
}
async function handlerUsers(req: Request, res: Response, next: NextFunction) {
	try {
		const parsedBody = req.body;
		if (!parsedBody.email || !parsedBody.password) {
			throw new BadRequestError("Something went wrong");
		}
		const hashedPassword = await hashPassword(parsedBody.password);
		const user = await createUserByEmail(parsedBody.email, hashedPassword);
		const userResponse : UserResponse = {
			id: user.id,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			email: user.email,
		};
		res.header("Content-Type", "application/json");
		res.status(201).send(JSON.stringify(userResponse));
	}
	catch (err) {
		next(err);
	}
}

async function handlerLogin(req: Request, res: Response, next: NextFunction) {
	try {
		const parsedBody = req.body;
		if (!parsedBody.email || !parsedBody.password) {
			throw new BadRequestError("Something went wrong");
		}
		let expiresIn = 3600;
		if(parsedBody.expiresInSeconds){
			expiresIn = parsedBody.expiresInSeconds;
		}
		const user = await getUserByEmail(parsedBody.email);
		if(!await checkPasswordHash(parsedBody.password, user.hashedPassword)){
			throw new UnauthorizedError("Wrong Password!");
		}
		const token = makeJWT(user.id, expiresIn, config.secret);
		const refreshToken = makeRefreshToken();
		const insertedRefreshToken = await createRefreshToken(refreshToken, 60, user.id);
		type LoginResponse = UserResponse & {token: string, refreshToken: string};
		const loginResponse : LoginResponse = {
			id: user.id,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			email: user.email,
			token: token,
			refreshToken: insertedRefreshToken.token,
		};
		res.header("Content-Type", "application/json");
		res.status(200).send(JSON.stringify(loginResponse));
	}
	catch (err) {
		next(err);
	}
}

async function handlerGetChirps(req: Request, res: Response, next: NextFunction) {
	try{
		const chirps = await getAllChirps();
		res.header("Content-Type", "application/json");
		res.status(200).send(JSON.stringify(chirps));
	} catch(err) {
		next(err);
	}
}

async function handlerGetChirpById(req: Request, res: Response, next: NextFunction) {
	try{
		const name = req.params.chirpId as string;
		const chirp = await getChirpById(name);
		if(!chirp){
			throw new NotFoundError("Chirp not found");
		}
		res.header("Content-Type", "application/json");
		res.status(200).send(JSON.stringify(chirp));
	} catch(err){
		next(err);
	}
}

async function handlerRefresh(req: Request, res: Response, next: NextFunction) {
	try{
		const refreshToken = getBearerToken(req);
		const tokenRow = await getRefreshToken(refreshToken);
		if(!tokenRow || tokenRow.expiresAt.getTime() < Date.now() || tokenRow.revokedAt){
			throw new UnauthorizedError("Unauthorized refresh token");
		}
		const token = makeJWT(tokenRow.userId, 3600, config.secret);
		res.header("Content-Type", "application/json");
		res.status(200).send(JSON.stringify({token: token}));
	} catch(err){
		next(err);
	}
}

async function handlerRevoke(req: Request, res: Response, next: NextFunction) {
	try{
		const refreshToken = getBearerToken(req);
		const tokenRow = await getRefreshToken(refreshToken);
		if(!tokenRow || tokenRow.expiresAt.getTime() < Date.now() || tokenRow.revokedAt){
			throw new UnauthorizedError("Unauthorized refresh token");
		}
		const revoked = await updateRefreshTokenRevocationDate(refreshToken);
		res.header("Content-Type", "application/json");
		res.status(204).send();
	} catch(err){
		next(err);
	}
}

async function handlerPutUsers(req: Request, res: Response, next: NextFunction) {
	try {
		const bearerToken = getBearerToken(req);
		const parsedBody = req.body;
		if (!parsedBody.email || !parsedBody.password) {
			throw new BadRequestError("Something went wrong");
		}
		const jwtSub = validateJWT(bearerToken, config.secret);
		const hashedPassword = await hashPassword(parsedBody.password);
		const user = await updateEmailAndPassword(parsedBody.email, hashedPassword, jwtSub);
		const userResponse : UserResponse = {
			id: user.id,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			email: user.email,
		};
		res.header("Content-Type", "application/json");
		res.status(200).send(JSON.stringify(userResponse));
	} catch (err) {
		next(err);
	}
}

async function handlerDeleteChirps(req: Request, res: Response, next: NextFunction) {
	try{
		const bearerToken = getBearerToken(req);
		const jwtSub = validateJWT(bearerToken, config.secret);
		const chirpId = req.params.chirpId as string;
		const chirp = await getChirpById(chirpId);
		if(!chirp){
			throw new NotFoundError("Chirp not found");
		}
		if(chirp.userId !== jwtSub){
			throw new ForbiddenError("Not allowed");
		}
		await deleteChirpById(chirp.id);
		res.header("Content-Type", "application/json");
		res.status(204).send();
	} catch(err){
		next(err);
	}
}
app.use(express.json());
app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc);

app.delete("/api/chirps/:chirpId", handlerDeleteChirps);
app.put("/api/users", handlerPutUsers)
app.post("/api/revoke", handlerRevoke);
app.post("/api/refresh", handlerRefresh);
app.post("/api/login", handlerLogin);
app.post("/api/users", handlerUsers)
app.post("/api/chirps", handlerChirps);
app.post("/admin/reset", handlerReset);
app.get("/api/chirps", handlerGetChirps);
app.get("/api/chirps/:chirpId", handlerGetChirpById);
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