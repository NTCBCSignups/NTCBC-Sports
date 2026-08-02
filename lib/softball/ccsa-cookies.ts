import { cookies } from "next/headers";

export const CCSA_COOKIE_NAME = "ccsa_session";
export const CCSA_EMAIL_COOKIE = "ccsa_email";

export async function loadCcsaCookies(): Promise<string[]> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(CCSA_COOKIE_NAME)?.value;
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCcsaCookies(ccsaCookies: string[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CCSA_COOKIE_NAME, JSON.stringify(ccsaCookies), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearCcsaCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CCSA_COOKIE_NAME);
  cookieStore.delete(CCSA_EMAIL_COOKIE);
}

export async function saveCcsaEmail(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CCSA_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function loadCcsaEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CCSA_EMAIL_COOKIE)?.value ?? null;
}
