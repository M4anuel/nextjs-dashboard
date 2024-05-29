
import { unstable_noStore as noStore } from 'next/cache';

const mysql = require('serverless-mysql')()
mysql.config({
  host: process.env.ENDPOINT,
  database: process.env.DATABASE,
  user: "NodeUser",
  password: "test"
})
let db = {};



export async function getCases() {
  try {
    console.log("querying...");
    const rows = await mysql.query("select * from cases");
    const plainObjects = rows.map((row: Object) => {
      return (Object.assign({}, row));
    });
    return JSON.stringify(plainObjects);
  } catch (error) {
    console.error("Error executing query:", error);
    throw error; // Propagate the error
  }
}