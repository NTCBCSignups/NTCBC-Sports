const API_BASE = "https://dashboard.ccsasoftball.net/api/v2";

import type {
  AdminInfo,
  Park,
  Passkey,
  PlayerProfile,
  PlayerSummary,
  ScoreSubmission,
  ScheduleGame,
  TeamDetail,
  TeamListItem,
} from "./ccsa-types";

// export types for external use (e.g. in scripts) without importing from ccsa-types directly
export type {
  AdminInfo,
  Park,
  Passkey,
  PlayerProfile,
  PlayerSummary,
  ScoreSubmission,
  ScheduleGame,
  TeamDetail,
  TeamListItem,
} from "./ccsa-types";

// -----------
// HTTP helpers
// -----------

type FetchFn = typeof globalThis.fetch;

let _fetch: FetchFn = globalThis.fetch;

/**
 * Override the fetch implementation used by all API methods.
 * Useful for injecting cookie-aware fetch in Node.js scripts.
 */
export function setFetchImpl(fn: FetchFn) {
  _fetch = fn;
}

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
  return _fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    cache: "no-store",
  }).then((r) => parseResponse<T>(r, url));
}

function post<T = unknown>(endpoint: string, data?: Record<string, unknown>) {
  const url = `${API_BASE}${endpoint}`;
  return _fetch(url, {
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

class CcsaApiError extends Error {
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
  postLogin: (ident: string, otp: string) => post<PlayerProfile>("/auth/postlogin", { ident, otp }),
  logout: () => post<void>("/auth/logout"),
  listAdmin: () => get<AdminInfo>("/auth/listadmin"),
  isAdmin: (adminType: string) => get<{ isadmin: boolean }>("/auth/isadmin", { type: adminType }),
  impersonate: (ident: string, otp: string, targetPlayerId: number) =>
    post<PlayerProfile>("/auth/impersonate", {
      ident,
      otp,
      target_playerid: targetPlayerId,
    }),

  /**
   * Check if there's a valid session, request a login code if not,
   * and authenticate using the OTP returned by `getOtp`.
   *
   * `getOtp` is a callback so the caller decides how to obtain the
   * code (CLI prompt, browser modal, etc.).
   */
  ensureAuth: async (email: string, getOtp: () => Promise<string>): Promise<PlayerProfile> => {
    try {
      const info = await auth.info();
      if (info?.playerid) return info;
    } catch {
      // session expired or missing — continue to login
    }
    await auth.requestLoginCode(email, "email");
    const otp = await getOtp();
    if (!otp) throw new Error("No login code provided.");
    return auth.postLogin(email, otp);
  },

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
      post<{ success: boolean }>(`/auth/webauthn/update/${encodeURIComponent(webauthnId)}`, {
        nickname,
      }),
    deletePasskey: (id: string) =>
      post<{ success: boolean }>(`/auth/webauthn/delete/${encodeURIComponent(id)}`),
    verifyImpersonate: (response: unknown, nonce: string, targetPlayerId: number) =>
      post<PlayerProfile>("/auth/webauthn/verify_impersonate", {
        response: response as Record<string, unknown>,
        nonce,
        target_playerid: targetPlayerId,
      }),
  },
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
  join: (teamPw: string) => post<{ success: boolean }>("/team/join", { teampw: teamPw }),
  getInvite: (teamId: number, secret: string) =>
    get<Record<string, unknown>>(
      `/team/${encodeURIComponent(teamId)}/invitation/${encodeURIComponent(secret)}`,
    ),
  leave: () => post<{ success: boolean }>("/team/leave"),
  get: (teamId: number, secret?: string) =>
    get<TeamDetail>(
      `/team/${encodeURIComponent(teamId)}${secret ? `?approvalcode=${encodeURIComponent(secret)}` : ""}`,
    ),
  addPlayer: (
    teamId: number,
    playerId: number,
    playerPw?: string,
    active: "player" | "nonplayer" = "player",
  ) =>
    post<PlayerSummary>(`/team/${encodeURIComponent(teamId)}/addplayer`, {
      playerid: playerId,
      playerpw: playerPw,
      active,
    }),
  updatePlayerStatus: (teamId: number, playerId: number, active: "player" | "nonplayer") =>
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
    post<{ success: boolean; message?: string }>(
      `/team/${encodeURIComponent(teamId)}/processpayment`,
      data,
    ),
  update: (teamId: number, data: Record<string, unknown>) =>
    post<{ success: boolean }>(`/team/${encodeURIComponent(teamId)}/update`, data),
  getPlayerExceptions: (teamId: number) =>
    get<Record<string, unknown>[]>(`/team/${encodeURIComponent(teamId)}/playerexceptions`),

  registration: {
    create: (data: Record<string, unknown>) =>
      post<{ success: boolean }>("/team/registration/create", data),
    inProgress: () => get<{ teams: Record<string, unknown>[] }>("/team/registration/inprogress"),
    inviteLeader: (teamId: number, playerId: number, playerPw: string, role: string) =>
      post<{ success: boolean }>("/team/registration/inviteleader", {
        teamid: teamId,
        playerid: playerId,
        playerpw: playerPw,
        role,
      }),
    submit: (teamId: number) =>
      post<{ success: boolean }>(`/team/registration/submit/${encodeURIComponent(teamId)}`),
    submitCovenant: (teamId: number, secret: string, data: Record<string, unknown>) =>
      post<{ success: boolean }>(
        `/team/registration/submitcovenant/${encodeURIComponent(teamId)}`,
        {
          ...data,
          approvalcode: secret,
        },
      ),
    existingTeamNames: (churchId: string | number) =>
      get<{ teams: { teamid: number; name: string; division: string }[] }>(
        "/team/registration/existingteamnames",
        { churchid: churchId },
      ),
  },
};

// /////////
// SCHED //
// /////////
export const sched = {
  getSchedule: () => get<{ schedule: ScheduleGame[]; lastupdate: string }>("/sched/schedule"),
  getStaging: () => get<{ schedule: ScheduleGame[]; lastupdate: string }>("/sched/staging"),
  deployStg: () => post<{ success: boolean }>("/sched/deploystg"),
  submitScore: (data: Record<string, unknown>) =>
    post<{ submissionid: number }>("/sched/submitscore", data),
  getParks: () => get<Park[]>("/sched/parks"),
  search: (query: Record<string, unknown>) => post<ScheduleGame[]>("/sched/search", query),
  getGame: (gc: string) =>
    get<{ game: ScheduleGame | null }>(`/sched/game/${encodeURIComponent(gc)}`),
  updateFull: (data: unknown) => post<{ success: boolean }>("/sched/update/full", { data }),

  submission: {
    listUser: () => get<{ scores: ScoreSubmission[] }>("/sched/submission/listuser"),
  },

  scoresheets: {
    listUser: () => get<{ data: Record<string, unknown>[] }>("/sched/scoresheets/listuser"),
  },

  admin: {
    submissions: () => get<Record<string, unknown>[]>("/sched/admin/submissions"),
    standings: () => get<Record<string, unknown>[]>("/sched/admin/standings"),
    noPlayDates: () => get<Record<string, unknown>[]>("/sched/admin/noplaydates"),
  },
};
