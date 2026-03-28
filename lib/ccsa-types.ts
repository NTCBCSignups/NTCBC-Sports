export interface PlayerProfile {
    playerid: number;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    church: string;
    christian: 0 | 1;
    sex: 1 | 2;
    address_street: string;
    address_city: string;
    address_postal: string;
    birthday: string;
    modifiedat: string;
    dir_email: string | null;
    dir_phone: string | null;
    playerpw: string | null;
    active: "player" | "nonplayer";
    needwaiver: false | "paper" | "online";
}

export interface PlayerSummary {
    playerid: number;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
}

export interface TeamLeader extends PlayerSummary {
    role: string;
}

export interface TeamDetail {
    teamid: number;
    name: string;
    division: string;
    church: {
        name: string;
        address_street?: string;
        leaders?: { name: string; email: string; phone: string; type: string }[];
    };
    leaders: TeamLeader[];
    teampw: string;
    finalized: boolean;
    paid: string | null;
}

export interface TeamListItem {
    teamid: number;
    teamname: string;
    division: string;
}

export interface AdminInfo {
    teams: {
        teamid: number;
        name: string;
        division: string;
        num_players: number;
        teamleader_roles: string;
        churchleader_roles: string;
        paid: string | null;
    }[];
    churches: { churchid: number; name: string; type: string }[];
}

export interface ScheduleGame {
    gamecode: string;
    date: string;
    time: string;
    park: number;
    park_name: string;
    home: number | null;
    home_name: string;
    away: number | null;
    away_name: string;
    umps: number | null;
    umps_name: string;
}

export interface Park {
    id: number;
    name: string;
}

export interface UmpTestScore {
    testdate: string;
    score: number;
    totalscore: number;
    pass: number | null;
}

export interface ChurchListItem {
    id: string;
    name: string;
    address: string;
}

export interface Passkey {
    webauthnID: string;
    nickname: string;
    lastUsedAt: string | null;
}

export interface YecTicket {
    ytid: number;
    purchase_date: string;
    used_date: string | null;
    sent_to: string | null;
}

export interface FallballPlayer extends PlayerSummary {
    summerplayer: boolean;
    total_amount: number;
    isleader: boolean;
    isgov: boolean;
}

export interface FallballTeam {
    teampw: string;
    isleader: boolean | number;
    isadmin: boolean;
    players: FallballPlayer[];
    fees_total: number;
}

export interface FallballStatus {
    team: FallballTeam | null;
    payments: {
        amount: number;
        date: string;
        method: number;
        receipt_url: string | null;
    }[];
}

export interface ScoreSubmission {
    submissionid: number;
    date: string;
    firstname: string;
    lastname: string;
    gamecode: string;
    home_name: string;
    home_final: number;
    away_name: string;
    away_final: number;
    game_date: string;
    game_time: string;
    park_name: string;
}
