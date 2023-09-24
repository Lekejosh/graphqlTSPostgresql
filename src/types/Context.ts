import { DataSource } from "typeorm";
import { Request, Response } from "express";

export type Context = {
  conn: DataSource;
  userId: string | undefined;
  req: Request;
  res: Response;
};
