const API_BASE = "https://dashboard.ccsasoftball.net/api/v2";

// -----------
// HTTP helpers
// -----------

function buildUrl(endpoint: string, data?: Record<string, unknown>): string {
    let url = `${API_BASE}${endpoint}`;
    if (data) {
        const qs = new URLSearchParams(
            Object.entries(data).reduce(
                (acc, [k, v]) => {
                    if (v !== undefined && v !== null) acc[k] = String(v);
                    return acc;
                },
                {} as Record<string, string>,
            ),
        ).toString();
        if (qs) url += `?${qs}`;
    }
    return url;
}

async function parseResponse<T>(response: Response, url: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new CcsaApiError(response.status, response.statusText, url, text);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
}

function get<T = unknown>(endpoint: string, data?: Record<string, unknown>) {
    const url = buildUrl(endpoint, data);
    return fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
    }).then((r) => parseResponse<T>(r, url));
}

function post<T = unknown>(endpoint: string, data?: Record<string, unknown>) {
    const url = `${API_BASE}${endpoint}`;
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json; charset=UTF-8",
        },
        credentials: "include",
        body: JSON.stringify(data ?? {}),
    }).then((r) => parseResponse<T>(r, url));
}

// -----------
// Error class
// -----------

export class CcsaApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public url: string,
        public body: string,
    ) {
        super(`CCSA API Error ${status} ${statusText}: ${body}`);
        this.name = "CcsaApiError";
    }
}

// //////////
// PARAMS //
// //////////
export const params = {
    deadlines: () => get("/params/deadlines"),
    get: (key: string) => get(`/params/${encodeURIComponent(key)}`),
};

// ////////
// AUTH //
// ////////
export const auth = {
    info: (reqparams?: string[]) =>
        reqparams
            ? post("/auth/info", { params: reqparams })
            : get("/auth/info"),
    requestLoginCode: (ident: string, dest: string) =>
        post("/auth/requestlogincode", { ident, dest }),
    postLogin: (ident: string, otp: string) =>
        post("/auth/postlogin", { ident, otp }),
    logout: () => post("/auth/logout"),
    listAdmin: () => get("/auth/listadmin"),
    isAdmin: (adminType: string) => get("/auth/isadmin", { type: adminType }),
    impersonate: (ident: string, otp: string, targetPlayerId: number) =>
        post("/auth/impersonate", {
            ident,
            otp,
            target_playerid: targetPlayerId,
        }),

    webauthn: {
        generateRegistrationOptions: () =>
            get("/auth/webauthn/generate_registration_options"),
        verifyRegistration: (response: unknown) =>
            post("/auth/webauthn/verify_registration", {
                response: response as Record<string, unknown>,
            }),
        generateLoginOptions: () =>
            get("/auth/webauthn/generate_login_options"),
        verifyLogin: (response: unknown, nonce: string) =>
            post("/auth/webauthn/verify_login", {
                response: response as Record<string, unknown>,
                nonce,
            }),
        getUserPasskeys: () => get("/auth/webauthn/user_passkeys"),
        updatePasskey: (webauthnId: string, nickname: string) =>
            post(
                `/auth/webauthn/update/${encodeURIComponent(webauthnId)}`,
                { nickname }
            ),
        deletePasskey: (id: string) =>
            post(`/auth/webauthn/delete/${encodeURIComponent(id)}`),
        verifyImpersonate: (
            response: unknown,
            nonce: string,
            targetPlayerId: number
        ) =>
            post("/auth/webauthn/verify_impersonate", {
                response: response as Record<string, unknown>,
                nonce,
                target_playerid: targetPlayerId,
            }),
    },
};

// //////////
// PLAYER //
// //////////
export const player = {
    create: (formdata: Record<string, unknown>) =>
        post("/player/create", formdata),
    checkEmail: (email: string) => post("/player/checkemail", { email }),
    requestEmailChange: (email: string) =>
        post("/player/requestemailchange", { email }),
    completeEmailChange: (playerId: number, otp: string) =>
        post("/player/completeemailchange", { playerid: playerId, otp }),
    update: (formdata: Record<string, unknown>) =>
        post("/player/update", formdata),
    needWaiver: () => get("/player/needwaiver"),
    acceptWaiver: (formdata: Record<string, unknown>) =>
        post("/player/acceptwaiver", formdata),
    acceptPaperWaiver: (playerId: number) =>
        post("/player/acceptpaperwaiver", { playerid: playerId }),
    getById: (id: number, type: "ump" | "full" = "full") =>
        get(
            `/player/byid/${encodeURIComponent(id)}/${encodeURIComponent(type)}`
        ),
    getTeam: (id: number) => post("/player/getteam", { playerid: id }),
    listWaivers: (id: number) =>
        get("/player/listwaivers", { playerid: id }),
    umpTestScores: () => get("/player/umptestscores"),
    paperWaiverUrl: () => get("/player/me/paperwaiverurl"),
    generateNewPw: () => post("/player/generatenewpw"),
    listTeamHistory: (playerId: number) =>
        get(`/player/${playerId}/listteamhistory`),
    listUmpTests: (playerId: number) =>
        get(`/player/${playerId}/listumptests`),
};

// ////////
// TEAM //
// ////////
export const team = {
    list: () => get("/team/list"),
    userTeam: (type?: string) => get("/team/userteam", type ? { type } : undefined),
    listPlayers: (teamId: number) =>
        get(`/team/${encodeURIComponent(teamId)}/listplayers`),
    removePlayer: (teamId: number, player: number) =>
        post(`/team/${encodeURIComponent(teamId)}/removeplayer`, { player }),
    join: (teamPw: string) => post("/team/join", { teampw: teamPw }),
    getInvite: (teamId: number, secret: string) =>
        get(
            `/team/${encodeURIComponent(teamId)}/invitation/${encodeURIComponent(secret)}`
        ),
    leave: () => post("/team/leave"),
    get: (teamId: number, secret?: string) =>
        get(
            `/team/${encodeURIComponent(teamId)}${secret ? `?approvalcode=${encodeURIComponent(secret)}` : ""}`
        ),
    addPlayer: (
        teamId: number,
        playerId: number,
        playerPw?: string,
        active: "player" | "nonplayer" = "player"
    ) =>
        post(`/team/${encodeURIComponent(teamId)}/addplayer`, {
            playerid: playerId,
            playerpw: playerPw,
            active,
        }),
    updatePlayerStatus: (
        teamId: number,
        playerId: number,
        active: "player" | "nonplayer"
    ) =>
        post(`/team/${encodeURIComponent(teamId)}/updateplayerstatus`, {
            playerid: playerId,
            active,
        }),
    getCovenant: (teamId: number, secret?: string) =>
        get(`/team/${encodeURIComponent(teamId)}/covenant`, {
            approvalcode: secret,
        }),
    allPlayerInfo: (teamId: number) =>
        get(`/team/${encodeURIComponent(teamId)}/allplayerinfo`),
    delete: (teamId: number) =>
        post(`/team/${encodeURIComponent(teamId)}/delete`),
    unfinalize: (teamId: number) =>
        post(`/team/${encodeURIComponent(teamId)}/unfinalize`),
    regeneratePw: (teamId: number) =>
        post(`/team/${encodeURIComponent(teamId)}/regeneratepw`),
    setLeadership: (teamId: number, targetId: number, type: string) =>
        post(`/team/${encodeURIComponent(teamId)}/setleadership`, {
            id: targetId,
            type,
        }),
    processPayment: (teamId: number, data: Record<string, unknown>) =>
        post(`/team/${encodeURIComponent(teamId)}/processpayment`, data),
    update: (teamId: number, data: Record<string, unknown>) =>
        post(`/team/${encodeURIComponent(teamId)}/update`, data),
    getPlayerExceptions: (teamId: number) =>
        get(`/team/${encodeURIComponent(teamId)}/playerexceptions`),

    registration: {
        create: (data: Record<string, unknown>) =>
            post("/team/registration/create", data),
        inProgress: () => get("/team/registration/inprogress"),
        inviteLeader: (
            teamId: number,
            playerId: number,
            playerPw: string,
            role: string
        ) =>
            post("/team/registration/inviteleader", {
                teamid: teamId,
                playerid: playerId,
                playerpw: playerPw,
                role,
            }),
        submit: (teamId: number) =>
            post(`/team/registration/submit/${encodeURIComponent(teamId)}`),
        submitCovenant: (
            teamId: number,
            secret: string,
            data: Record<string, unknown>
        ) =>
            post(`/team/registration/submitcovenant/${encodeURIComponent(teamId)}`, {
                ...data,
                approvalcode: secret,
            }),
        existingTeamNames: (churchId: number) =>
            get("/team/registration/existingteamnames", { churchid: churchId }),
    },
};

// //////////
// CHURCH //
// //////////
export const church = {
    list: () => get("/church/list"),
    create: (formdata: Record<string, unknown>) =>
        post("/church/create", formdata),
    applyForAdmin: (churchId: number, data: Record<string, unknown>) =>
        post(`/church/${encodeURIComponent(churchId)}/applyforadmin`, data),
    listAdminRequests: () => get("/church/listadminrequests"),
    approveAdmin: (requestId: number) =>
        post("/church/approveadmin", { associd: requestId }),
    rejectAdmin: (requestId: number) =>
        post("/church/rejectadmin", { associd: requestId }),
};

// /////////
// SCHED //
// /////////
export const sched = {
    getSchedule: () => get("/sched/schedule"),
    getStaging: () => get("/sched/staging"),
    deployStg: () => post("/sched/deploystg"),
    submitScore: (data: Record<string, unknown>) =>
        post("/sched/submitscore", data),
    getParks: () => get("/sched/parks"),
    search: (query: Record<string, unknown>) => post("/sched/search", query),
    getGame: (gc: string) =>
        get(`/sched/game/${encodeURIComponent(gc)}`),
    updateFull: (data: unknown) => post("/sched/update/full", { data }),

    submission: {
        listUser: () => get("/sched/submission/listuser"),
    },

    scoresheets: {
        listUser: () => get("/sched/scoresheets/listuser"),
    },

    admin: {
        submissions: () => get("/sched/admin/submissions"),
        standings: () => get("/sched/admin/standings"),
        noPlayDates: () => get("/sched/admin/noplaydates"),
    },
};

// ///////////
// UMP TEST //
// ///////////
export const umptest = {
    newAttempt: () => get("/umptest/newattempt"),
    reg: {
        get: () => get("/umptest/reg"),
        list: () => get("/umptest/reg/list"),
        reset: (targetPlayerId: number) =>
            post("/umptest/reg/reset", { target_playerid: targetPlayerId }),
    },
    scores: {
        list: () => get("/umptest/scores/list"),
        upload: () => get("/umptest/scores/upload"),
        add: (data: unknown) => post("/umptest/scores/add", { data }),
        byTeam: () => get("/umptest/scores/by/team"),
    },
};

// ///////////
// GEAR UP //
// ///////////
export const gearup = {
    reg: {
        get: () => get("/gearup/reg"),
        register: (meal: string, comments: string) =>
            post("/gearup/reg/register", { meal, comments }),
        cancel: () => post("/gearup/reg/cancel"),
        list: () => get("/gearup/reg/list"),
        byTeam: () => get("/gearup/reg/byteam"),
        getByPlayerId: (playerId: number) =>
            get(`/gearup/reg/playerid/${encodeURIComponent(playerId)}`),
        checkIn: (playerId: number, action: string) =>
            post(
                `/gearup/reg/playerid/${encodeURIComponent(playerId)}/${encodeURIComponent(action)}`
            ),
    },
};

// ////////
// FORMS //
// ////////
export const forms = {
    awards: {
        submit: (data: Record<string, unknown>) => post("/forms/awards", data),
        get: () => get("/forms/awards"),
    },
    noPlayDates: {
        get: (teamId: number) =>
            get(`/forms/noplaydates/team/${encodeURIComponent(teamId)}`),
        submit: (teamId: number, data: Record<string, unknown>) =>
            post(`/forms/noplaydates/team/${encodeURIComponent(teamId)}`, data),
    },
};

// ///////////
// INFOSYS //
// ///////////
export const infosys = {
    teams: {
        list: () => get("/infosys/teams/list"),
        recordPayment: (
            teamId: number,
            amount: number,
            method: string,
            notes: string
        ) =>
            post("/infosys/teams/recordpayment", {
                teamid: teamId,
                amount,
                method,
                notes,
            }),
        payments: (teamId: number) =>
            get(`/infosys/teams/${encodeURIComponent(teamId)}/payments`),
    },
    newTeamNames: {
        get: () => get("/infosys/newteamnames"),
        post: (ntnId: number, teamName: string) =>
            post("/infosys/newteamnames", { ntn_id: ntnId, teamname: teamName }),
    },
    churches: {
        list: () => get("/infosys/churches/list"),
        leaders: {
            add: (
                churchId: number,
                opts: { playerid: number; type: string; contact: string }
            ) =>
                post(
                    `/infosys/churches/${encodeURIComponent(churchId)}/leaders/add`,
                    opts
                ),
            edit: (
                clId: number,
                opts: { playerid: number; type: string; contact: string }
            ) =>
                post(`/infosys/churches/leaders/${encodeURIComponent(clId)}`, opts),
            del: (clId: number) =>
                post(`/infosys/churches/leaders/del/${encodeURIComponent(clId)}`),
        },
    },
    leaderDirectory: () => get("/infosys/leaderdirectory"),
    searchPlayers: (query: string, limit?: number) =>
        post("/infosys/searchplayers", { query, limit }),
    recentWaivers: () => get("/infosys/recentwaivers"),
    acceptPaperWaiver: (targetPlayerId: number) =>
        post("/infosys/acceptpaperwaiver", { target_playerid: targetPlayerId }),
    players: {
        list: () => get("/infosys/players/list"),
        listByEmail: (emails: string[]) =>
            post("/infosys/players/listbyemail", { emails }),
    },
};

// /////////////////////////
// ANNOUNCEMENTS + EVENTS //
// /////////////////////////
export const announcements = {
    events: () => get("/ann/events"),
    announcements: () => get("/ann/announcements"),
    all: () => get("/ann/all"),
    editAnnouncement: (data: Record<string, unknown>) =>
        post("/ann/editannouncement", data),
    editEvent: (data: Record<string, unknown>) =>
        post("/ann/editevent", data),
};

// ///////
// YEC //
// ///////
export const yec = {
    get: () => get("/yec/tickets"),
    buy: (data: Record<string, unknown>) => post("/yec/buy", data),
    send: (ticketIds: number[], email: string) =>
        post("/yec/send", { ticketids: ticketIds, email }),
    tickets: {
        all: () => get("/yec/tickets/all"),
        get: (code: string) =>
            get(`/yec/tickets/${encodeURIComponent(code)}`),
        do: (code: string, action: string) =>
            post(
                `/yec/tickets/${encodeURIComponent(code)}/${encodeURIComponent(action)}`
            ),
        comp: (targetPlayerId: number, numTix: number, refundExisting: boolean) =>
            post("/yec/tickets/comp", {
                target_playerid: targetPlayerId,
                num_tix: numTix,
                refund_existing: refundExisting,
            }),
    },
};

// ///////////
// FALLBALL //
// ///////////
export const fallball = {
    status: () => get("/fallball/status"),
    create: () => post("/fallball/create"),
    regeneratePw: () => post("/fallball/regeneratepw"),
    processPayment: (payload: Record<string, unknown>) =>
        post("/fallball/payment", payload),
    leave: () => post("/fallball/leave"),
    join: (teamPw: string) => post("/fallball/join", { teampw: teamPw }),

    list: {
        players: () => get("/fallball/list/players"),
        teams: () => get("/fallball/list/teams"),
        summary: () => get("/fallball/list/summary"),
    },

    admin: {
        create: (playerId: number, isLeader: boolean) =>
            post("/fallball/admin/create", { playerid: playerId, isleader: isLeader }),
        addPlayer: (fbTeamId: number, playerId: number, isLeader: boolean) =>
            post("/fallball/admin/add_player", {
                fbteamid: fbTeamId,
                playerid: playerId,
                isleader: isLeader,
            }),
        removePlayer: (playerId: number) =>
            post("/fallball/admin/remove_player", { playerid: playerId }),
        getTeam: (fbTeamId: number) =>
            get(`/fallball/admin/team/${encodeURIComponent(fbTeamId)}`),
    },
};

// /////////
// ERRORS //
// /////////
export const errors = {
    report: (data: Record<string, unknown>) => post("/errors/report", data),
};

// /////////
// ALERTS //
// /////////
export const alert = {
    previewTeams: (times: unknown, parks: unknown) =>
        post("/alert/previewteams", { times, parks } as Record<string, unknown>),
    broadcastToLeaders: (teamIds: number[], title: string, message: string) =>
        post("/alert/broadcasttoleaders", { teamids: teamIds, title, message }),
};

// //////////
// HEARTBEAT
// //////////
export const heartbeat = () => get("/heartbeat");
