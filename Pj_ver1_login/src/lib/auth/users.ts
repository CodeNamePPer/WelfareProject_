import bcrypt from "bcryptjs";
import type { Role } from "./roles";
import { supabaseAdmin } from "../supabase";

export type EmploymentStatus = "ACTIVE" | "RESIGNED";

export interface User {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  role: Role;
  status: EmploymentStatus;
  passwordHash: string;
  lastLoginAt?: string;
  updatedAt?: string;
}





export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const key = identifier.trim().toLowerCase();

  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .or(`email.ilike.${key},employee_id.ilike.${key}`)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        employeeId: data.employee_id,
        email: data.email,
        name: data.name,
        role: data.role as Role,
        status: data.status as EmploymentStatus,
        passwordHash: data.password_hash,
        lastLoginAt: data.last_login_at ?? undefined,
      };
    }
  } catch (err) {
    console.error("Supabase findUser error", err);
  }
  return null;
}

export async function markLogin(userId: string): Promise<void> {
  const now = new Date().toISOString();

  try {
    await supabaseAdmin
      .from("users")
      .update({ last_login_at: now })
      .eq("id", userId);
  } catch (err) {
    console.error("Supabase markLogin error", err);
  }
}

// Pre-computed hash for dummy timing comparison (bcrypt 10 rounds for "dummy-password-for-timing")
const DUMMY_HASH = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW";

export async function verifyPassword(user: User | null, password: string): Promise<boolean> {
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  return user !== null && ok;
}

export async function getAllUsers(): Promise<Omit<User, "passwordHash">[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, employee_id, email, name, role, status, last_login_at, updated_at")
      .order("created_at", { ascending: true });

    if (!error && data) {
      return data.map((u) => ({
        id: u.id,
        employeeId: u.employee_id,
        email: u.email,
        name: u.name,
        role: u.role as Role,
        status: u.status as EmploymentStatus,
        lastLoginAt: u.last_login_at ?? undefined,
        updatedAt: u.updated_at ?? undefined,
      }));
    }
  } catch (err) {
    console.error("Supabase getAllUsers error", err);
  }
  return [];
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  try {
    const dbUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.employeeId !== undefined) dbUpdate.employee_id = data.employeeId;
    if (data.name !== undefined) dbUpdate.name = data.name;
    if (data.email !== undefined) dbUpdate.email = data.email;
    if (data.role !== undefined) dbUpdate.role = data.role;
    if (data.status !== undefined) dbUpdate.status = data.status;
    if (data.passwordHash !== undefined) dbUpdate.password_hash = data.passwordHash;

    await supabaseAdmin
      .from("users")
      .update(dbUpdate)
      .eq("id", userId);
  } catch (err) {
    console.error("Supabase updateUser error", err);
  }
}
