import sqlite3 from "sqlite3";

export type sql = string;
let db: sqlite3.Database;

export async function open(path: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    db = new sqlite3.Database(path, function (err) {
      if (err) reject("Open error: " + err.message);
      else resolve(path + " opened");
    });
  });
}

// any query: insert/delete/update
export async function run(query: sql): Promise<boolean> {
  return new Promise(function (resolve, reject) {
    db.run(query, function (err: unknown) {
      if (err) reject((<Error>err).message);
      else resolve(true);
    });
  });
}

// first row read
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function get(query: sql, params: any[]): Promise<any> {
  return new Promise(function (resolve, reject) {
    db.get(query, params, function (err, row) {
      if (err) reject("Read error: " + err.message);
      else {
        resolve(row);
      }
    });
  });
}

// set of rows read
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function all(query: sql, params: any[]): Promise<any[]> {
  return new Promise(function (resolve, reject) {
    if (params == undefined) params = [];

    db.all(query, params, function (err, rows) {
      if (err) reject("Read error: " + err.message);
      else {
        resolve(rows);
      }
    });
  });
}
