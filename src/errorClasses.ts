export class BadRequestError extends Error {
    constructor(message: string){
        super(message);
        this.name = "400 Bad Request Error";
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string){
        super(message);
        this.name = "401 Unauthorized Error";
    }
}

export class ForbiddenError extends Error {
    constructor(message: string){
        super(message);
        this.name = "403 Forbidden Error";
    }
}


export class NotFoundError extends Error {
    constructor(message: string){
        super(message);
        this.name = "404 Not Found Error";
    }
}

