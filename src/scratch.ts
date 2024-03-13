import * as https from "https";
import * as ws from "ws";

interface cookieOption {
    key: string;
    value: string;
}
interface Cookie {
    [key: string]: string;
}
interface Events {
    [key: string]: Function[];
}
interface CloudVar {
    [key: string]: string;
}
export class scratch {
    cookie: Cookie;
    events: Events;
    username: string;
    password: string;
    constructor(username: string, password: string) {
        this.events = {};
        this.username = username;
        this.cookie = {};
        this.password = password;
        this.login();
        setInterval(this.login, 1000 * 60 * 60 * 24);
    }
    login() {
        let login = https.request(
            "https://scratch.mit.edu/accounts/login/",
            {
                method: "POST",
                headers: {
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36",
                    "x-csrftoken": "a",
                    "x-requested-with": "XMLHttpRequest",
                    referer: "https://scratch.mit.edu",
                    Cookie: "scratchcsrftoken=a;scratchlanguage=en;",
                },
            },
            (response) => {
                console.log(response);
                if (response.statusCode !== 200) {
                    throw new Error("パスワードまたはユーザー名が違います");
                }
                let noCookie = ["Domain", "expires", "Max-Age", "Path"];
                let base: cookieOption[][] = (<string[]>response.headers["set-cookie"]).map((cookie: string) => {
                    return (<string[]>cookie.match(/[^=;]+=[^;]*/g)).map((cookie) => {
                        cookie = cookie.trim();
                        let a = cookie.split("=");
                        return {
                            key: a[0],
                            value: a.slice(1).join("="),
                        };
                    });
                });
                this.cookie = {};
                for (let i = 0; i < base.length; ++i) {
                    for (let j in base[i]) {
                        let val = base[i][j];
                        if (!noCookie.includes(val.key)) {
                            this.cookie[val.key] = val.value;
                        }
                    }
                }
                if ("login" in this.events) {
                    for (let i = 0; i < this.events["login"].length; ++i) {
                        this.events["login"][i]();
                    }
                }
            }
        );
        login.write(
            JSON.stringify({
                username: this.username,
                useMessage: true,
                password: this.password,
            })
        );
        login.end();
    }
    on(event: string, callback: Function) {
        if (event in this.events) {
            this.events[event].push(callback);
        } else {
            this.events[event] = [callback];
        }
    }
    curator(studioId: string, username: string) {
        fetch("https://scratch.mit.edu/site-api/users/curators-in/" + studioId + "/invite_curator/?usernames=" + username, {
            headers: {
                cookie: "scratchsessionsid=" + this.cookie["scratchsessionsid"] + ";scratchcsrftoken=" + this.cookie["scratchcsrftoken"],
                origin: "https://scratch.mit.edu",
                referer: "https://scratch.mit.edu",
                "x-csrftoken": this.cookie["scratchcsrftoken"],
            },
            method: "PUT",
        })
            .then((val) => val.text())
            .then((json) => {
                console.log(json);
            });
    }
    cloudScratch(projectID: string, events: Events = {}, clVars: CloudVar = {}): { on: Function; set: Function; getVar: Function } {
        try {
            function sendPacket(d: object) {
                if (websocket.readyState == 1) {
                    websocket.send(JSON.stringify(d) + "\n");
                }
            }
            let websocket = new ws.WebSocket("wss://clouddata.scratch.mit.edu", {
                headers: {
                    cookie: "scratchsessionsid=" + this.cookie["scratchsessionsid"] + ";",
                    origin: "https://scratch.mit.edu",
                },
            });
            websocket.on("open", () => {
                sendPacket({
                    method: "handshake",
                    project_id: projectID,
                    user: this.username,
                });
                if ("open" in ev) {
                    ev.open.forEach((value) => value());
                }
            });
            websocket.on("message", (event) => {
                let li = event.toString().split("\n");
                for (let i = 0; i < li.length - 1; ++i) {
                    let e = JSON.parse(li[i]);
                    vars[e.name.slice(2)] = e.value;
                    if ("change" in ev) {
                        ev.change.forEach((value) => value(e.name.slice(2), e.value));
                    }
                }
            });
            websocket.onclose = () => {
                console.log("close");
                websocket = new ws.WebSocket("wss://clouddata.scratch.mit.edu", {
                    headers: {
                        cookie: "scratchsessionsid=" + this.cookie["scratchsessionsid"] + ";",
                        origin: "https://scratch.mit.edu",
                    },
                });
            };
            let ev: Events = events;
            let vars: CloudVar = clVars;
            return {
                on: (event: string, callback: Function) => {
                    if (event in ev) {
                        ev[event].push(callback);
                    } else {
                        ev[event] = [callback];
                    }
                },
                set: (name: string, value: string) => {
                    sendPacket({
                        method: "set",
                        user: this.username,
                        project_id: projectID,
                        name: "☁ " + name,
                        value: value,
                    });
                    vars[name] = value;
                },
                getVar: (name: string) => {
                    return vars[name];
                },
            };
        } catch (e) {
            return this.cloudScratch(projectID);
        }
    }
}
