import sqlite3 from "sqlite3";

export type sql = string;
export class Database {
  _db: sqlite3.Database | null = null;
  public async open(path: string): Promise<this> {
    return new Promise((resolve, reject) => {
      this._db = new sqlite3.Database(path, (err) => {
        if (err) reject((<Error>err).message);
        else resolve(this);
      });
    });
  }
  // any query: insert/delete/update
  public async run(query: sql): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this._db) {
        reject("DB Not Connected");
        return;
      }
      this._db.run(query, (err: unknown) => {
        if (err) reject((<Error>err).message);
        else resolve(true);
      });
    });
  }

  // first row read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async get(query: sql, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this._db) {
        reject("DB Not Connected");
        return;
      }
      this._db.get(query, params, (err, row) => {
        if (err) reject("Read error: " + err.message);
        else {
          resolve(row);
        }
      });
    });
  }

  // set of rows read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async all(query: sql, params: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (params == undefined) params = [];
      if (!this._db) {
        reject("DB Not Connected");
        return;
      }
      this._db.all(query, params, (err, rows) => {
        if (err) reject("Read error: " + err.message);
        else {
          resolve(rows);
        }
      });
    });
  }
}
