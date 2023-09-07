import { DataSource } from "typeorm";
import { Request, Response } from "express";

export type Context = {
  conn: DataSource;
  userId: number | undefined;
  req: Request;
  res: Response;
};
