const mysql = require("mysql");
const pool = mysql.createPool({
    connectionLimit: 10,
    password: process.env.DATABASE_PASSWORD,
    user: process.env.DATABASE_USER,
    database: process.env.DATABASE,
    host: process.env.DATABASE_HOST,
});
let db = {};
/** CASE RELATED STUFF **/

export async function getCases() {
    // Add noStore() here to prevent the response from being cached.
    // This is equivalent to in fetch(..., {cache: 'no-store'}).
    return ["test1", "test2"]
    noStore();
    try {
        // Artificially delay a response for demo purposes.
        // Don't do this in production :)
        pool.query(
            `SELECT * FROM 
    (SELECT * FROM cases AS interview LEFT JOIN wp_terms USING(casecode)) tablewt 
    LEFT OUTER JOIN ip USING (ip_id) LEFT JOIN pool USING (casecode)
    WHERE casecode = ?
        `,
            [casecode],
            (interviews) => {

                return interviews[0];
            }
        );

    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch revenue data.');
    }
}

db.getCase = (casecode) => {
    return new Promise((resolve, reject) => {
        pool.query(
            `SELECT * FROM 
        (SELECT * FROM cases AS interview LEFT JOIN wp_terms USING(casecode)) tablewt 
        LEFT OUTER JOIN ip USING (ip_id) LEFT JOIN pool USING (casecode)
        WHERE casecode = ?
            `,
            [casecode],
            (error, interviews) => {
                if (error) reject(error);
                resolve(interviews[0]);
            }
        );
    });
};
db.getCases2 = () => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT * FROM (SELECT * FROM cases INNER JOIN wp_terms USING(casecode)) tablewt LEFT OUTER JOIN ip USING (ip_id) LEFT JOIN pool USING (casecode) ",
            (error, surveys) => {
                if (error) {
                    reject(error);
                }
                resolve(surveys);
            }
        );
    });
};

db.getCasesWithRole = (workpool, status) => {
    return new Promise((resolve, reject) => {
        pool.query(
            `SELECT *
            FROM pool
            LEFT JOIN users ON pool.revisioner_id = users.user_id
            INNER JOIN cases USING(casecode)
            WHERE workpool LIKE ? AND status LIKE ?
        `,
            [workpool, status],
            (error, surveys) => {
                if (error) {
                    reject(error);
                }
                resolve({ surveys: surveys, pool: workpool == "HiWi" ? "Pool HiWi" : "Pool Studierende" });
            }
        );
    });
};
db.getCasesFromPoolAndStatus = (workpool, status) => {
    return new Promise((resolve, reject) => {
        pool.query(
            `SELECT *
            FROM pool
            LEFT JOIN users ON pool.revisioner_id = users.user_id
            INNER JOIN cases USING(casecode)
            WHERE workpool LIKE ? AND status LIKE ?
        `,
            [workpool, status],
            (error, surveys) => {
                if (error) {
                    reject(error);
                }
                resolve({ surveys: surveys });
            }
        );
    });
};


db.getCasesWithParams2 = (parameters) => {
    return new Promise((resolve, reject) => {

        pool.query(queryBuilder2(parameters), (error, surveys) => {
            if (error) {
                reject(error);
            }
            resolve(surveys);
        });
    });
};
function queryBuilder2(parameters) {
    var query = "SELECT * FROM cases LEFT OUTER JOIN ip USING (ip_id) LEFT JOIN pool USING (casecode) WHERE ";
    for (const [key, value] of Object.entries(parameters)) {
        query += "(";
        if (Array.isArray(value)) {
            for (var pos in value) {
                query +=
                    key + " LIKE '%" + value[pos] + "%' OR ";
            }
            query = query.substring(0, query.length - 4) + ") AND ";
        } else {
            query += key + " LIKE '%" + value + "%') AND "
        }
        query = query.substring(0, query.length - 4) + "AND ";
    }
    return query.substring(0, query.length - 4);
}









db.getCasesWithParams = (parameters) => {
    return new Promise((resolve, reject) => {
        pool.query(queryBuilder(parameters), (error, surveys) => {
            if (error) {
                reject(error);
            }
            resolve(surveys);
        });
    });
};
function queryBuilder(parameters) {
    var usedParams = {};
    parameters.forEach((parameter) => {
        if (usedParams[Object.keys(parameter)]) {
            usedParams[Object.keys(parameter)].push(
                parameter[Object.keys(parameter)]
            );
        } else {
            usedParams[Object.keys(parameter)] = [
                parameter[Object.keys(parameter)],
            ];
        }
    });
    var query = "SELECT * FROM cases LEFT OUTER JOIN ip USING (ip_id) LEFT JOIN pool USING (casecode) WHERE ";
    for (var parameter in usedParams) {
        query += "(";
        for (var pos in usedParams[parameter]) {
            query +=
                parameter + " LIKE '%" + usedParams[parameter][pos] + "%' OR ";
        }
        query = query.substring(0, query.length - 4) + ") AND ";
    }
    return query.substring(0, query.length - 4);
}
/** workbook stuff **/
db.getCasesFromUser = (username) => {
    return new Promise((resolve, reject) => {
        pool.query(
            `SELECT casecode, status, username
            FROM pool INNER JOIN users ON user_id = revisioner_id 
            WHERE username = ?`,
            [username],
            (error, ueberarbeitet) => {
                if (error) reject(error);
                pool.query(
                    `SELECT casecode, status, username
                    FROM pool INNER JOIN users ON user_id = corrector_id 
                    WHERE username = ?`,
                    [username],
                    (error, korrigiert) => {
                        if (error) resolve(ueberarbeitet);
                        pool.query(
                            `SELECT casecode, status, username
                            FROM workbook INNER Join users on user_id = analyser_id
                            WHERE username = ?`,
                            [username],
                            (error, analyse) => {
                                if (error) resolve(ueberarbeitet, ueberarbeitet);
                                resolve(ueberarbeitet, korrigiert, analyse);
                            }
                        )
                    }
                )
            }
        )
    })
}
db.getCasesForWorkbook = (session_id) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT user_id FROM sessions WHERE session_id = ?",
            [session_id],
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    pool.query(
                        `SELECT casecode, status, revisioner_id FROM pool WHERE revisioner_id = ? OR corrector_id = ?`,
                        [result[0].user_id, result[0].user_id],
                        (error, surveys) => {
                            if (error) {
                                reject(error);
                            } else {
                                pool.query(
                                    `SELECT casecode, status, analyser_id FROM workbook WHERE analyser_id = ?`,
                                    [result[0].user_id],
                                    (error, analysis) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            const response = [surveys, analysis];
                                            resolve(response);
                                        }
                                    }
                                );
                            }

                        }
                    );
                }
            }
        );
    });
};
db.addCaseToWorkbookA = (session_id, casecode) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT user_id FROM sessions WHERE session_id = ?",
            [session_id],
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    pool.query(
                        `SELECT EXISTS (SELECT * FROM workbook WHERE casecode = ? AND analyser_id = ?) as result`,
                        [casecode, result[0].user_id],
                        (error, exists) => {

                            if (error || exists[0].result) {
                                if (exists[0].result) {
                                    resolve("Case already added");
                                }
                                reject(error);
                            } else {
                                pool.query(
                                    `INSERT INTO workbook (casecode, analyser_id) VALUES(?,?)`,
                                    [casecode, result[0].user_id],
                                    (error) => {
                                        if (error) {
                                            if (error.code == "ER_DUP_ENTRY") {
                                                resolve("Case already added");
                                            }
                                            reject(error);
                                        }
                                        resolve("Case added sucessfully");
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    });
};
/**
 * Adds a case to either the correction or the revision pool.
 * checks if the case state is "in Pool", if it is it sets its state to "ausgewählt" else it sets it to "in Korrektur"
 * @param {string} session_id - The ID of the session.
 * @param {string} casecode - The code of the case.
 * @return {Promise} A Promise object that resolves with the surveys object if the function completes successfully, or rejects with an error message if an error occurs.
 * @throws {Error} Throws an error if an error occurs.
 */
db.addCaseToWorkbook = (session_id, casecode) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT user_id FROM sessions WHERE session_id = ?",
            [session_id],
            (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    pool.query(`SELECT status from pool WHERE casecode = ?`,
                        [casecode],
                        (error, state) => {
                            if (error) {
                                reject(error);
                            }
                            if (state[0].status === "in Pool") {
                                pool.query(
                                    `UPDATE pool SET status = 'ausgewählt', revisioner_id = ? WHERE casecode = ?`,
                                    [result[0].user_id, casecode],
                                    (error, surveys) => {
                                        if (error) {
                                            if (error.code == "ER_DUP_ENTRY") {
                                                resolve("Case already added");
                                            }
                                            reject(error);
                                        }
                                        resolve(surveys);
                                    }
                                );
                            }
                            else {
                                pool.query(
                                    `UPDATE pool SET status = 'in Korrektur', corrector_id = ? WHERE casecode = ?`,
                                    [result[0].user_id, casecode],
                                    (error, surveys) => {
                                        if (error) {
                                            if (error.code == "ER_DUP_ENTRY") {
                                                resolve("Case already added");
                                            }
                                            reject(error);
                                        }
                                        resolve(surveys);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    });
};
db.deleteCaseFromPool = (user_id, casecode) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE pool SET revisioner_id = NULL, status = 'in Pool' WHERE revisioner_id = ? AND casecode = ?",
            [user_id, casecode],
            (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }
        );
    });
};
db.deleteCaseFromPoolA = (user_id, casecode) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "DELETE FROM workbook WHERE analyser_id = ? AND casecode = ?",
            [user_id, casecode],
            (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }
        );
    });
};
// Pool Stuff
db.addCaseToPool = (poolname, casecode, user_id) => {
    return new Promise((resolve, reject) => {
        pool.query(
            `INSERT INTO pool (casecode, workpool) VALUES(?,?)`,
            [casecode, poolname, user_id],
            (error) => {
                if (error) {
                    if (error.code == "ER_DUP_ENTRY") {
                        resolve("Case already added");
                    }
                    reject(error);
                }
                resolve();
            }
        );
    });
};
db.revokeCaseFromPool = (casecode) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "DELETE FROM pool WHERE casecode = ? AND revisioner_id is NULL",
            [casecode],
            (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }
        );
    });
};
// case status stuff
db.updateCaseStatus = (user_id, casecode, status) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE pool SET status = ? WHERE revisioner_id = ? and casecode = ?",
            [status, user_id, casecode],
            (error) => {
                if (error) {
                    reject(error);
                }
                if (status != "ausgewählt") {
                    db.revokeCaseFromPool(casecode);
                }
                resolve(true);
            }
        );
    });
};
db.updateCaseStatusA = (user_id, casecode, status) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE workbook SET status = ? WHERE analyser_id = ? and casecode = ?",
            [status, user_id, casecode],
            (error) => {
                if (error) {
                    reject(error);
                }
                resolve(true);
            }
        );
    });
};
db.updateCaseStatusAndUser = (original_user_id, user_id, casecode, status) => {
    return new Promise((resolve, reject) => {
        if (user_id == 0) user_id = null;
        pool.query(
            "UPDATE pool SET status = ?, revisioner_id = ? WHERE revisioner_id = ? and casecode = ?",
            [status, user_id, original_user_id, casecode],
            (error) => {
                if (error) {
                    reject(error);
                }
                if (status != "ausgewählt") {
                    db.revokeCaseFromPool(casecode);
                }
                resolve(true);
            }
        );
    });
};
db.getCaseStates = () => {
    return new Promise((resolve, reject) => {
        pool.query(
            `SELECT pool.workpool, pool.casecode, pool.status, users.username, users.role, correctors.username AS corrector_username
            FROM pool
            LEFT JOIN users ON pool.revisioner_id = users.user_id
            LEFT JOIN users AS correctors ON pool.corrector_id = correctors.user_id;
            `,
            (error, states) => {
                if (error) {
                    reject(error);
                } else {
                    pool.query(
                        `SELECT casecode
                        FROM cases
                        WHERE casecode NOT IN (SELECT casecode FROM pool);
                        `,
                        (error, notinprogress) => {
                            if (error) {
                                reject(error);
                            } else {
                                pool.query(
                                    `SELECT * FROM workbook LEFT JOIN users ON analyser_id = user_id`,
                                    (error, analysis) => {
                                        if (error) {
                                            reject(error);
                                        }
                                        resolve([states, notinprogress, analysis]);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    });
};

/** LOGIN RELATED STUFF */
db.createUser = (username, email, password, role) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
            [username, email, password, role],
            (error) => {
                if (error) {
                    if (error.code == "ER_DUP_ENTRY") {
                        resolve("User existiert schon");
                    } else {
                        reject(error);
                    }
                }
                resolve();
            }
        );
    });
};
db.deleteUser = (user_id) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "DELETE FROM users WHERE user_id =?",
            [user_id],
            (error, result) => {
                if (error) {
                    reject(error);
                }
                resolve(result.insertId);
            }
        );
    });
};
db.updateUser = (user_id, username, email, role) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE users SET username = ?, email = ?, role = ? WHERE user_id = ?",
            [username, email, role, user_id],
            (error, result) => {
                if (error) {
                    reject(error);
                }
                resolve(true);
            }
        );
    });
};
db.updatePassword = (user_id, password) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "UPDATE users SET password = ? WHERE user_id = ?",
            [password, user_id],
            (error) => {
                if (error) {
                    reject(error);
                }
                resolve(true);
            }
        );
    });
};
db.getUsers = () => {
    return new Promise((resolve, reject) => {
        pool.query("SELECT * FROM users", (error, users) => {
            if (error) {
                reject(error);
            }
            resolve(users);
        });
    });
};
db.getUserFromSession = (session_id) => {
    return new Promise((resolve, reject) => {
        pool.query("SELECT username, users.role from sessions inner join users using(user_id) where session_id = ?;", [session_id], (error, user) => {
            if (error) {
                reject(error);
            }
            resolve(user[0]);
        });
    });
};
db.getUser = (userinfo) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT EXISTS (SELECT * FROM users WHERE username = ? OR user_id = ?) as result",
            [userinfo, userinfo],
            (error, exists) => {
                if (error) {
                    reject(error);
                }
                if (exists[0].result) {
                    let query;
                    if (isNaN(userinfo)) query = "SELECT user_id, username, role FROM users WHERE username = ?";
                    else query = "SELECT user_id, username, role FROM users WHERE user_id = ?"
                    pool.query(
                        query,
                        [userinfo],
                        (error, user) => {
                            if (error) {
                                reject(error);
                            }
                            resolve({
                                user_id: user[0].user_id,
                                username: user[0].username,
                                funkt: user[0].role,
                            });
                        }
                    );
                } else {
                    reject("Benutzer nicht gefunden");
                }
            }
        );
    });
};
db.getUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email],
            (error, users) => {
                if (error) {
                    reject(error);
                }
                resolve(users[0]);
            }
        );
    });
};
db.userExists = (username) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT EXISTS (SELECT * FROM users WHERE username =?) as result",
            [username],
            (error, exists) => {
                if (error) {
                    reject(error);
                }
                resolve(exists[0].result);
            }
        );
    });
};
db.userExists = (username, email) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT EXISTS (SELECT * FROM users WHERE username =? OR email =?) 'result'",
            [username, email],
            (error, exists) => {
                if (error) {
                    reject(error);
                }
                resolve(exists[0].result);
            }
        );
    });
};
db.getHashedPassword = (username) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT EXISTS (SELECT * FROM users WHERE username =?) as result",
            [username],
            (error, exists) => {
                if (error) {
                    reject(error);
                }
                if (exists[0].result) {
                    pool.query(
                        "SELECT password FROM users WHERE username = ?",
                        [username],
                        (error, resp) => {
                            if (error || resp.length == 0) {
                                reject(error);
                            }
                            resolve(resp[0].password);
                        }
                    );
                } else {
                    reject("Benutzername oder Passwort stimmt nicht");
                }
            }
        );
    });
};
db.getRole = (session_id) => {
    return new Promise((resolve, reject) => {
        pool.query("SELECT role FROM sessions WHERE session_id = ?", [session_id], (error, role) => {
            if (error || role.length == 0) {
                reject(error);
            }
            resolve(role[0].role);
        });
    });
}
/**ALL SESSION RELATED STUFF */
db.startSession = (session_id, user_id, role) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "DELETE FROM sessions WHERE user_id = ?",
            [user_id],
            (error) => {
                if (error) {
                    reject(error);
                } else {
                    pool.query(
                        "INSERT INTO sessions (session_id, user_id, role) VALUES (?,?,?)",
                        [session_id, user_id, role],
                        (error) => {
                            if (error) {
                                reject(error);
                            }
                            resolve(true);
                        }
                    );
                }
            }
        );
    });
};
db.validateSession = (session_id) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT EXISTS (SELECT * FROM sessions WHERE session_id =? AND expiry_time > UNIX_TIMESTAMP()) as result",
            [session_id],
            (error, exists) => {
                if (error) {
                    reject(error);
                }
                resolve(exists[0].result == 1);
            }
        );
    });
};
db.cleanOldSessions = () => {
    return new Promise((resolve, reject) => {
        pool.query(
            "DELETE FROM sessions WHERE expiry_time < UNIX_TIMESTAMP()",
            (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            }
        );
    });
};
db.stopSession = (session_id) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "DELETE FROM sessions WHERE session_id = ?",
            [session_id],
            (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            }
        );
    });
};
// Session User stuff
db.getRoleFromSession = (session_id) => {
    return new Promise((resolve, reject) => {
        if (typeof session_id !== 'undefined' && session_id) {
            pool.query(
                "SELECT role FROM sessions WHERE session_id = ?",
                [session_id],
                (error, result) => {
                    if (error || result.length == 0) {
                        if (error) reject(error);
                        else reject("wrong session key");
                    } else {
                        resolve(result[0].role);
                    }
                }
            );
        } else {
            resolve("");
        }
    });
};
db.getSessionUser = (session_id) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT user_id FROM sessions WHERE session_id = ?",
            [session_id],
            (error, result) => {
                if (error) {
                    reject(error);
                }
                resolve(result[0].user_id);
            }
        );
    });
};
//-------------------------------------------------------------------------------------------------------
/** ENTER CASE RELATED STUFF */
db.getIPs = () => {
    return new Promise((resolve, reject) => {
        pool.query("select * from ip", (error, ips) => {
            if (error) {
                reject(error);
            }
            resolve(ips);
        });
    });
};
db.getIP = (name) => {
    return new Promise((resolve, reject) => {
        pool.query(
            "SELECT EXISTS(SELECT * FROM ip WHERE name = ?)",
            [name],
            (error, exists) => {
                if (error) {
                    reject(error);
                } else if (exists[0]) {
                    pool.query(
                        "SELECT ip_id FROM ip WHERE name = ?)",
                        [name],
                        (error, ip_id) => {
                            if (error) {
                                reject(error);
                            } else resolve(ip_id);
                        }
                    );
                } else {
                    pool.query("INSERT INTO ip VALUES (?)", [name], (error) => {
                        if (error) {
                            reject(error);
                        }
                        pool.query(
                            "SELECT ip_id FROM ip WHERE name = ?)",
                            [name],
                            (error, ip_id) => {
                                if (error) {
                                    reject(error);
                                } else resolve(ip_id);
                            }
                        );
                    });
                }
            }
        );
    });
};
db.getIP = (connection, name) => {
    return new Promise((resolve, reject) => {
        connection.query(
            "SELECT EXISTS(SELECT * FROM ip WHERE name = ?)",
            [name],
            (error, exists) => {
                if (error) {
                    reject(error);
                }
                if (exists[0]) {
                    connection.query(
                        "SELECT ip_id FROM ip WHERE name = ?",
                        [name],
                        (error, ip_id) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(ip_id[0]);
                            }
                        }
                    );
                } else {
                    db.enterIP(connection, name).then(() => {
                        connection.query(
                            "SELECT ip_id FROM ip WHERE name = ?",
                            [name],
                            (error, ip_id) => {
                                if (error) {
                                    reject(error);
                                }
                                resolve(ip_id[0]);
                            }
                        );
                    });
                }
            }
        );
    });
};
db.enterIP = (connection, name) => {
    return new Promise((resolve, reject) => {
        connection.query("INSERT INTO ip VALUES (NULL, ?)", [name], (error) => {
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
};
db.deleteIP = (name) => {
    return new Promise((resolve, reject) => {
        pool.query("DELETE * FROM ip WHERE name = ?", [name], (error) => {
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
};

// TO BE UPDATED
db.enterCase = (parameter) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((error, connection) => {
            console.log("trying to connect to DB...");
            if (error) {
                //Transaction Error (Rollback and release connection)
                connection.rollback(() => {
                    connection.release();
                    reject(error);
                    //Failure
                });
            }
            console.log("connected \ntrying to get IP...");
            db.getIP(connection, parameter.ip).then((result, error) => {
                if (error) {
                    connection.rollback(() => {
                        connection.release();
                        reject(error);
                        //Failure
                    });
                }
                console.log(
                    "IP Successfully gathered \ntrying to fill memos..."
                );
                fillInterviewMemo(connection, parameter, result.ip_id).then(
                    (error) => {
                        if (error) {
                            connection.rollback(() => {
                                connection.release();
                                reject(error);
                                //Failure
                            });
                        }
                        console.log(
                            "memos successfully fileld \ntrying to fill reviews..."
                        );
                        fillInterviewReview(connection, parameter).then(
                            (error) => {
                                if (error) {
                                    connection.rollback(() => {
                                        connection.release();
                                        reject(error);
                                        //Failure
                                    });
                                }
                                fillwp_begriffe(
                                    parameter.casecode,
                                    parameter.begriffe
                                ).then((error) => {
                                    if (error) {
                                        connection.rollback(() => {
                                            connection.release();
                                            reject(error);
                                            //Failure
                                        });
                                    } else {
                                        connection.release();
                                        console.log(
                                            "successfully inserted all Data"
                                        );
                                        resolve();
                                        //Success
                                    }
                                });
                            }
                        );
                    }
                );
            });
        });
    });
};
async function fillwp_begriffe(casecode, begriffe) {
    return new Promise((resolve, reject) => {
        for (index in begriffe) {
            connection.query(
                "INSERT INTO wp_terms VALUES (?,?)",
                [casecode, begriffe[index]],
                (error) => {
                    if (error) {
                        reject(error);
                    }
                }
            );
        }
        resolve();
    });
}
async function fillInterviewMemo(connection, parameter, ip_id) {
    return new Promise((resolve, reject) => {
        connection.query(
            "INSERT INTO cases(casecode, idpers, ip_id" +
            "sonstige_begriffe, metaphern, metapher_wort," +
            "ap_spirituell, heilungserfahrung, wp_art, " +
            "offenheit_erzaehlung, anteil_mundart, intellekt," +
            "ideologie, erfahrung, private_praxis, " +
            "oeffentliche_praxis, konsequenzen, neg_kirchen, " +
            "missbrauchsskandal, pos_kirchen, sinnfragen, " +
            "existentielle_fragen, probleme_psych_gesundheit, probleme_koerp_gesundheit, " +
            "spiritualität, bezugsperson, rel_spir_suche, " +
            "verb_psych_gesundheit, verb_koerp_gesundheit, paranorm_phaenomene" +
            ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                parameter.casecode,
                idpers,
                ip_id,
                parameter.sonstige_begriffe,
                parameter.metaphern,
                parameter.metapher_wort,
                parameter.ap_spirituell,
                parameter.heilungserfahrung,
                parameter.wp_art,
                parameter.offenheit_erzaehlung,
                parameter.anteil_mundart,
                parameter.intellekt,
                parameter.ideologie,
                parameter.erfahrung,
                parameter.private_praxis,
                parameter.oeffentliche_praxis,
                parameter.konsequenzen,
                parameter.neg_kirchen,
                parameter.missbrauchsskandal,
                parameter.pos_kirchen,
                parameter.sinnfragen,
                parameter.existentielle_fragen,
                parameter.probleme_psych_gesundheit,
                parameter.probleme_koerp_gesundheit,
                parameter.spiritualität,
                parameter.bezugsperson,
                parameter.rel_spir_suche,
                parameter.verb_psych_gesundheit,
                parameter.verb_koerp_gesundheit,
                parameter.paranorm_phaenomene,
            ],
            (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            }
        );
    });
}

async function fillInterviewReview(connection, parameter) {
    return new Promise((resolve, reject) => {
        connection.query(interviewReviewSQLBuilder(parameter), (error) => {
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
}

function interviewReviewSQLBuilder(parameter) {
    var checkedVariables = "";
    if (parameter.hasOwnProperty("angeschaut"))
        checkedVariables += "angeschaut, ";
    if (parameter.hasOwnProperty("einhorn")) checkedVariables += "einhorn, ";
    if (parameter.hasOwnProperty("ms_forms_memo"))
        checkedVariables += "ms_forms_memo, ";
    if (parameter.hasOwnProperty("interviewmemo"))
        checkedVariables += "interviewmemo, ";
    if (parameter.hasOwnProperty("audiomemo"))
        checkedVariables += "audiomemo, ";
    if (parameter.hasOwnProperty("schriftliches_memo"))
        checkedVariables += "schriftliches_memo, ";
    if (parameter.hasOwnProperty("videoaufnahme"))
        checkedVariables += "videoaufnahme, ";
    if (parameter.hasOwnProperty("audioaufnahme"))
        checkedVariables += "audioaufnahme, ";
    if (parameter.hasOwnProperty("maxqda_package"))
        if (parameter.hasOwnProperty("ueberarbeitete_projektdatei"))
            checkedVariables += "ueberarbeitete_projektdatei, ";
    if (parameter.hasOwnProperty("backup_word_der_Projektdatei"))
        checkedVariables += "backup_word_der_Projektdatei, ";
    if (parameter.hasOwnProperty("uebersetzung"))
        checkedVariables += "uebersetzung, ";
    if (parameter.hasOwnProperty("spss_interview"))
        checkedVariables += "spss_interview, ";
    if (parameter.hasOwnProperty("spss_interviewzeit"))
        checkedVariables += "spss_interviewzeit, ";

    checkedVariables =
        checkedVariables.substring(0, checkedVariables.length - 2) + ")";
    var values =
        "('" +
        parameter.casecode +
        "', '" +
        parameter.sprache +
        "', '" +
        parameter.transkription +
        "', '" +
        parameter.notizen +
        "', ";
    if (parameter.hasOwnProperty("ueberarbeitung"))
        values += "'" + parameter.ueberarbeitung + "', '";
    else values += "'', ";
    for (i = 0; i < checkedVariables.split(",").length; i++) {
        values += "1, ";
    }
    values = values.substring(0, values.length - 2) + ")";
    var sql =
        "INSERT INTO cases(casecode, sprache, transkription, notizen, ueberarbeitung, " +
        checkedVariables +
        " VALUES " +
        values;
    return sql;
}
db.getExportData = () => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT pool.casecode,pool.status,users.username,users.role, 
        pool.workpool, correctors.username AS corrector_username, 
        cases.sprache, cases.einhorn, cases.ms_forms_memo, cases.interviewmemo, 
        cases.audiomemo, cases.schriftliches_memo, cases.weiterverarbeitung_moeglich, 
        cases.uebersetzung
        FROM pool
        LEFT JOIN users ON pool.revisioner_id = users.user_id
        LEFT JOIN users AS correctors ON pool.corrector_id = correctors.user_id
        LEFT JOIN cases USING (casecode);
    `, (error, ips) => {
            if (error) {
                reject(error);
            }
            resolve(ips);
        });
    });
};
db.getExportData2 = () => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT workbook.casecode, workbook.status, users.username, users.role
        FROM workbook
        LEFT JOIN users ON workbook.analyser_id = users.user_id
    `, (error, ips) => {
            if (error) {
                reject(error);
            }
            resolve(ips);
        });
    });
};
module.exports = db;
