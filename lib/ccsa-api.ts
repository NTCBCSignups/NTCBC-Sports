const API_BASE = "https://dashboard.ccsasoftball.net/api/v2";

import type {
    AdminInfo,
    ChurchListItem,
    FallballStatus,
    Park,
    Passkey,
    PlayerProfile,
    PlayerSummary,
    ScoreSubmission,
    ScheduleGame,
    TeamDetail,
    TeamListItem,
    UmpTestScore,
    YecTicket,
} from "./ccsa-types";

export type {
    AdminInfo,
    ChurchListItem,
    FallballPlayer,
    FallballStatus,
    FallballTeam,
    Park,
    Passkey,
    PlayerProfile,
    PlayerSummary,
    ScoreSubmission,
    ScheduleGame,
    TeamDetail,
    TeamLeader,
    TeamListItem,
    UmpTestScore,
    YecTicket,
} from "./ccsa-types";

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
        cache: "no-store",
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
        cache: "no-store",
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
    deadlines: () => get<Record<string, string>>("/params/deadlines"),
    get: (key: string) => get<Record<string, unknown>>(`/params/${encodeURIComponent(key)}`),
};

// ////////
// AUTH //
// ////////
export const auth = {
    info: (reqparams?: string[]) =>
        reqparams
            ? post<PlayerProfile>("/auth/info", { params: reqparams })
            : get<PlayerProfile>("/auth/info"),
    requestLoginCode: (ident: string, dest: string) =>
        post<{ success: boolean }>("/auth/requestlogincode", { ident, dest }),
    postLogin: (ident: string, otp: string) =>
        post<PlayerProfile>("/auth/postlogin", { ident, otp }),
    logout: () => post<void>("/auth/logout"),
    listAdmin: () => get<AdminInfo>("/auth/listadmin"),
    isAdmin: (adminType: string) =>
        get<{ isadmin: boolean }>("/auth/isadmin", { type: adminType }),
    impersonate: (ident: string, otp: string, targetPlayerId: number) =>
        post<PlayerProfile>("/auth/impersonate", {
            ident,
            otp,
            target_playerid: targetPlayerId,
        }),

    webauthn: {
        generateRegistrationOptions: () =>
            get<Record<string, unknown>>("/auth/webauthn/generate_registration_options"),
        verifyRegistration: (response: unknown) =>
            post<{ verified: boolean }>("/auth/webauthn/verify_registration", {
                response: response as Record<string, unknown>,
            }),
        generateLoginOptions: () =>
            get<Record<string, unknown>>("/auth/webauthn/generate_login_options"),
        verifyLogin: (response: unknown, nonce: string) =>
            post<PlayerProfile>("/auth/webauthn/verify_login", {
                response: response as Record<string, unknown>,
                nonce,
            }),
        getUserPasskeys: () => get<Passkey[]>("/auth/webauthn/user_passkeys"),
        updatePasskey: (webauthnId: string, nickname: string) =>
            post<{ success: boolean }>(
                `/auth/webauthn/update/${encodeURIComponent(webauthnId)}`,
                { nickname }
            ),
        deletePasskey: (id: string) =>
            post<{ success: boolean }>(`/auth/webauthn/delete/${encodeURIComponent(id)}`),
        verifyImpersonate: (
            response: unknown,
            nonce: string,
            targetPlayerId: number
        ) =>
            post<PlayerProfile>("/auth/webauthn/verify_impersonate", {
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
        post<{ playerid: number }>("/player/create", formdata),
    checkEmail: (email: string) =>
        post<{ valid: boolean }>("/player/checkemail", { email }),
    requestEmailChange: (email: string) =>
        post<{ success: boolean }>("/player/requestemailchange", { email }),
    completeEmailChange: (playerId: number, otp: string) =>
        post<void>("/player/completeemailchange", { playerid: playerId, otp }),
    update: (formdata: Record<string, unknown>) =>
        post<PlayerProfile>("/player/update", formdata),
    needWaiver: () =>
        get<{ needwaiver: false | "paper" | "online" }>("/player/needwaiver"),
    acceptWaiver: (formdata: Record<string, unknown>) =>
        post<{ success: boolean }>("/player/acceptwaiver", formdata),
    acceptPaperWaiver: (playerId: number) =>
        post<{ success: boolean }>("/player/acceptpaperwaiver", { playerid: playerId }),
    getById: (id: number, type: "ump" | "full" = "full") =>
        get<PlayerProfile>(
            `/player/byid/${encodeURIComponent(id)}/${encodeURIComponent(type)}`
        ),
    getTeam: (id: number) =>
        post<TeamDetail | null>("/player/getteam", { playerid: id }),
    listWaivers: (id: number) =>
        get<Record<string, unknown>[]>("/player/listwaivers", { playerid: id }),
    umpTestScores: () => get<UmpTestScore[]>("/player/umptestscores"),
    paperWaiverUrl: () => get<{ url: string }>("/player/me/paperwaiverurl"),
    generateNewPw: () => post<{ newpw: string }>("/player/generatenewpw"),
    listTeamHistory: (playerId: number) =>
        get<Record<string, unknown>[]>(`/player/${playerId}/listteamhistory`),
    listUmpTests: (playerId: number) =>
        get<Record<string, unknown>[]>(`/player/${playerId}/listumptests`),
};

// ////////
// TEAM //
// ////////
export const team = {
    list: () => get<{ teams: TeamListItem[] }>("/team/list"),
    userTeam: (type?: string) =>
        get<TeamDetail | null>("/team/userteam", type ? { type } : undefined),
    listPlayers: (teamId: number) =>
        get<{ players: PlayerSummary[] }>(`/team/${encodeURIComponent(teamId)}/listplayers`),
    removePlayer: (teamId: number, player: number) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/removeplayer`, { player }),
    join: (teamPw: string) =>
        post<{ success: boolean }>("/team/join", { teampw: teamPw }),
    getInvite: (teamId: number, secret: string) =>
        get<Record<string, unknown>>(
            `/team/${encodeURIComponent(teamId)}/invitation/${encodeURIComponent(secret)}`
        ),
    leave: () => post<{ success: boolean }>("/team/leave"),
    get: (teamId: number, secret?: string) =>
        get<TeamDetail>(
            `/team/${encodeURIComponent(teamId)}${secret ? `?approvalcode=${encodeURIComponent(secret)}` : ""}`
        ),
    addPlayer: (
        teamId: number,
        playerId: number,
        playerPw?: string,
        active: "player" | "nonplayer" = "player"
    ) =>
        post<PlayerSummary>(`/team/${encodeURIComponent(teamId)}/addplayer`, {
            playerid: playerId,
            playerpw: playerPw,
            active,
        }),
    updatePlayerStatus: (
        teamId: number,
        playerId: number,
        active: "player" | "nonplayer"
    ) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/updateplayerstatus`, {
            playerid: playerId,
            active,
        }),
    getCovenant: (teamId: number, secret?: string) =>
        get<Record<string, unknown>>(`/team/${encodeURIComponent(teamId)}/covenant`, {
            approvalcode: secret,
        }),
    allPlayerInfo: (teamId: number) =>
        get<PlayerProfile[]>(`/team/${encodeURIComponent(teamId)}/allplayerinfo`),
    delete: (teamId: number) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/delete`),
    unfinalize: (teamId: number) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/unfinalize`),
    regeneratePw: (teamId: number) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/regeneratepw`),
    setLeadership: (teamId: number, targetId: number, type: string) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/setleadership`, {
            id: targetId,
            type,
        }),
    processPayment: (teamId: number, data: Record<string, unknown>) =>
        post<{ success: boolean; message?: string }>(`/team/${encodeURIComponent(teamId)}/processpayment`, data),
    update: (teamId: number, data: Record<string, unknown>) =>
        post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/update`, data),
    getPlayerExceptions: (teamId: number) =>
        get<Record<string, unknown>[]>(`/team/${encodeURIComponent(teamId)}/playerexceptions`),

    registration: {
        create: (data: Record<string, unknown>) =>
            post<{ success: boolean }>("/team/registration/create", data),
        inProgress: () =>
            get<{ teams: Record<string, unknown>[] }>("/team/registration/inprogress"),
        inviteLeader: (
            teamId: number,
            playerId: number,
            playerPw: string,
            role: string
        ) =>
            post<{ success: boolean }>("/team/registration/inviteleader", {
                teamid: teamId,
                playerid: playerId,
                playerpw: playerPw,
                role,
            }),
        submit: (teamId: number) =>
            post<{ success: boolean }>(`/team/registration/submit/${encodeURIComponent(teamId)}`),
        submitCovenant: (
            teamId: number,
            secret: string,
            data: Record<string, unknown>
        ) =>
            post<{ success: boolean }>(`/team/registration/submitcovenant/${encodeURIComponent(teamId)}`, {
                ...data,
                approvalcode: secret,
            }),
        existingTeamNames: (churchId: number) =>
            get<{ teams: { teamid: number; name: string; division: string }[] }>("/team/registration/existingteamnames", { churchid: churchId }),
    },
};

// //////////
// CHURCH //
// //////////
export const church = {
    list: () => get<ChurchListItem[]>("/church/list"),
    create: (formdata: Record<string, unknown>) =>
        post<{ churchid: string }>("/church/create", formdata),
    applyForAdmin: (churchId: number, data: Record<string, unknown>) =>
        post<{ success: boolean }>(`/church/${encodeURIComponent(churchId)}/applyforadmin`, data),
    listAdminRequests: () => get<Record<string, unknown>[]>("/church/listadminrequests"),
    approveAdmin: (requestId: number) =>
        post<{ success: boolean }>("/church/approveadmin", { associd: requestId }),
    rejectAdmin: (requestId: number) =>
        post<{ success: boolean }>("/church/rejectadmin", { associd: requestId }),
};

// /////////
// SCHED //
// /////////
export const sched = {
    getSchedule: () =>
        get<{ schedule: ScheduleGame[]; lastupdate: string }>("/sched/schedule"),
    getStaging: () =>
        get<{ schedule: ScheduleGame[]; lastupdate: string }>("/sched/staging"),
    deployStg: () => post<{ success: boolean }>("/sched/deploystg"),
    submitScore: (data: Record<string, unknown>) =>
        post<{ submissionid: number }>("/sched/submitscore", data),
    getParks: () => get<Park[]>("/sched/parks"),
    search: (query: Record<string, unknown>) =>
        post<ScheduleGame[]>("/sched/search", query),
    getGame: (gc: string) =>
        get<{ game: ScheduleGame | null }>(`/sched/game/${encodeURIComponent(gc)}`),
    updateFull: (data: unknown) =>
        post<{ success: boolean }>("/sched/update/full", { data }),

    submission: {
        listUser: () =>
            get<{ scores: ScoreSubmission[] }>("/sched/submission/listuser"),
    },

    scoresheets: {
        listUser: () =>
            get<{ data: Record<string, unknown>[] }>("/sched/scoresheets/listuser"),
    },

    admin: {
        submissions: () => get<Record<string, unknown>[]>("/sched/admin/submissions"),
        standings: () => get<Record<string, unknown>[]>("/sched/admin/standings"),
        noPlayDates: () => get<Record<string, unknown>[]>("/sched/admin/noplaydates"),
    },
};

// ///////////
// UMP TEST //
// ///////////
export const umptest = {
    newAttempt: () => get<{ url: string }>("/umptest/newattempt"),
    reg: {
        get: () =>
            get<{
                registration: Record<string, unknown> | null;
                scores: UmpTestScore[];
                max_completions: number;
            }>("/umptest/reg"),
        list: () => get<Record<string, unknown>[]>("/umptest/reg/list"),
        reset: (targetPlayerId: number) =>
            post<{ success: boolean }>("/umptest/reg/reset", { target_playerid: targetPlayerId }),
    },
    scores: {
        list: () => get<Record<string, unknown>[]>("/umptest/scores/list"),
        upload: () => get<Record<string, unknown>>("/umptest/scores/upload"),
        add: (data: unknown) =>
            post<{ success: boolean }>("/umptest/scores/add", { data }),
        byTeam: () => get<Record<string, unknown>[]>("/umptest/scores/by/team"),
    },
};

// ///////////
// GEAR UP //
// ///////////
export const gearup = {
    reg: {
        get: () =>
            get<{ data: { mealchoice: string; comments: string } | null }>("/gearup/reg"),
        register: (meal: string, comments: string) =>
            post<{ success: boolean }>("/gearup/reg/register", { meal, comments }),
        cancel: () => post<{ success: boolean }>("/gearup/reg/cancel"),
        list: () => get<Record<string, unknown>[]>("/gearup/reg/list"),
        byTeam: () => get<Record<string, unknown>[]>("/gearup/reg/byteam"),
        getByPlayerId: (playerId: number) =>
            get<Record<string, unknown>>(`/gearup/reg/playerid/${encodeURIComponent(playerId)}`),
        checkIn: (playerId: number, action: string) =>
            post<{ success: boolean }>(
                `/gearup/reg/playerid/${encodeURIComponent(playerId)}/${encodeURIComponent(action)}`
            ),
    },
};

// ////////
// FORMS //
// ////////
export const forms = {
    awards: {
        submit: (data: Record<string, unknown>) =>
            post<{ success: boolean }>("/forms/awards", data),
        get: () => get<Record<string, unknown>[]>("/forms/awards"),
    },
    noPlayDates: {
        get: (teamId: number) =>
            get<Record<string, unknown>>(`/forms/noplaydates/team/${encodeURIComponent(teamId)}`),
        submit: (teamId: number, data: Record<string, unknown>) =>
            post<{ success: boolean }>(`/forms/noplaydates/team/${encodeURIComponent(teamId)}`, data),
    },
};

// ///////////
// INFOSYS //
// ///////////
export const infosys = {
    teams: {
        list: () => get<Record<string, unknown>[]>("/infosys/teams/list"),
        recordPayment: (
            teamId: number,
            amount: number,
            method: string,
            notes: string
        ) =>
            post<{ success: boolean }>("/infosys/teams/recordpayment", {
                teamid: teamId,
                amount,
                method,
                notes,
            }),
        payments: (teamId: number) =>
            get<Record<string, unknown>[]>(`/infosys/teams/${encodeURIComponent(teamId)}/payments`),
    },
    newTeamNames: {
        get: () => get<Record<string, unknown>[]>("/infosys/newteamnames"),
        post: (ntnId: number, teamName: string) =>
            post<{ success: boolean }>("/infosys/newteamnames", { ntn_id: ntnId, teamname: teamName }),
    },
    churches: {
        list: () => get<Record<string, unknown>[]>("/infosys/churches/list"),
        leaders: {
            add: (
                churchId: number,
                opts: { playerid: number; type: string; contact: string }
            ) =>
                post<{ success: boolean }>(
                    `/infosys/churches/${encodeURIComponent(churchId)}/leaders/add`,
                    opts
                ),
            edit: (
                clId: number,
                opts: { playerid: number; type: string; contact: string }
            ) =>
                post<{ success: boolean }>(`/infosys/churches/leaders/${encodeURIComponent(clId)}`, opts),
            del: (clId: number) =>
                post<{ success: boolean }>(`/infosys/churches/leaders/del/${encodeURIComponent(clId)}`),
        },
    },
    leaderDirectory: () =>
        get<{
            team_leaders: Record<string, unknown>[];
            umpires: Record<string, unknown>[];
            church_leaders: Record<string, unknown>[];
        }>("/infosys/leaderdirectory"),
    searchPlayers: (query: string, limit?: number) =>
        post<PlayerSummary[]>("/infosys/searchplayers", { query, limit }),
    recentWaivers: () => get<Record<string, unknown>[]>("/infosys/recentwaivers"),
    acceptPaperWaiver: (targetPlayerId: number) =>
        post<{ success: boolean }>("/infosys/acceptpaperwaiver", { target_playerid: targetPlayerId }),
    players: {
        list: () => get<Record<string, unknown>[]>("/infosys/players/list"),
        listByEmail: (emails: string[]) =>
            post<Record<string, unknown>[]>("/infosys/players/listbyemail", { emails }),
    },
};

// /////////////////////////
// ANNOUNCEMENTS + EVENTS //
// /////////////////////////
export const announcements = {
    events: () => get<Record<string, unknown>[]>("/ann/events"),
    announcements: () => get<Record<string, unknown>[]>("/ann/announcements"),
    all: () => get<Record<string, unknown>>("/ann/all"),
    editAnnouncement: (data: Record<string, unknown>) =>
        post<{ success: boolean }>("/ann/editannouncement", data),
    editEvent: (data: Record<string, unknown>) =>
        post<{ success: boolean }>("/ann/editevent", data),
};

// ///////
// YEC //
// ///////
export const yec = {
    get: () => get<YecTicket[]>("/yec/tickets"),
    buy: (data: Record<string, unknown>) =>
        post<{ success: boolean }>("/yec/buy", data),
    send: (ticketIds: number[], email: string) =>
        post<{ success: boolean }>("/yec/send", { ticketids: ticketIds, email }),
    tickets: {
        all: () => get<YecTicket[]>("/yec/tickets/all"),
        get: (code: string) =>
            get<YecTicket>(`/yec/tickets/${encodeURIComponent(code)}`),
        do: (code: string, action: string) =>
            post<{ success: boolean }>(
                `/yec/tickets/${encodeURIComponent(code)}/${encodeURIComponent(action)}`
            ),
        comp: (targetPlayerId: number, numTix: number, refundExisting: boolean) =>
            post<{ success: boolean }>("/yec/tickets/comp", {
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
    status: () => get<FallballStatus>("/fallball/status"),
    create: () => post<{ success: boolean }>("/fallball/create"),
    regeneratePw: () => post<{ success: boolean }>("/fallball/regeneratepw"),
    processPayment: (payload: Record<string, unknown>) =>
        post<{ success: boolean; message?: string }>("/fallball/payment", payload),
    leave: () => post<{ success: boolean }>("/fallball/leave"),
    join: (teamPw: string) =>
        post<{ success: boolean }>("/fallball/join", { teampw: teamPw }),

    list: {
        players: () => get<Record<string, unknown>[]>("/fallball/list/players"),
        teams: () => get<Record<string, unknown>[]>("/fallball/list/teams"),
        summary: () => get<Record<string, unknown>>("/fallball/list/summary"),
    },

    admin: {
        create: (playerId: number, isLeader: boolean) =>
            post<{ success: boolean }>("/fallball/admin/create", { playerid: playerId, isleader: isLeader }),
        addPlayer: (fbTeamId: number, playerId: number, isLeader: boolean) =>
            post<{ success: boolean }>("/fallball/admin/add_player", {
                fbteamid: fbTeamId,
                playerid: playerId,
                isleader: isLeader,
            }),
        removePlayer: (playerId: number) =>
            post<{ success: boolean }>("/fallball/admin/remove_player", { playerid: playerId }),
        getTeam: (fbTeamId: number) =>
            get<Record<string, unknown>>(`/fallball/admin/team/${encodeURIComponent(fbTeamId)}`),
    },
};

// /////////
// ERRORS //
// /////////
export const errors = {
    report: (data: Record<string, unknown>) =>
        post<{ success: boolean }>("/errors/report", data),
};

// /////////
// ALERTS //
// /////////
export const alert = {
    previewTeams: (times: unknown, parks: unknown) =>
        post<Record<string, unknown>>("/alert/previewteams", { times, parks } as Record<string, unknown>),
    broadcastToLeaders: (teamIds: number[], title: string, message: string) =>
        post<{ success: boolean }>("/alert/broadcasttoleaders", { teamids: teamIds, title, message }),
};

// //////////
// HEARTBEAT
// //////////
export const heartbeat = () => get<{ status: string }>("/heartbeat");
