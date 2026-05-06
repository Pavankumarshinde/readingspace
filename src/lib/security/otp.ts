import crypto from "crypto";

export type OtpPurpose = "profile_update" | "forgot_password";

export interface OtpConfig {
  otpLength: number;
  otpTtlMinutes: number;
  proofTtlMinutes: number;
  maxAttempts: number;
  cooldownSeconds: number;
}

const DEFAULT_CONFIG: OtpConfig = {
  otpLength: 6,
  otpTtlMinutes: 10,
  proofTtlMinutes: 15,
  maxAttempts: 5,
  cooldownSeconds: 60,
};

function getPepper() {
  return (
    process.env.OTP_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-otp-pepper"
  );
}

export function getOtpConfig(): OtpConfig {
  return DEFAULT_CONFIG;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function isEmailIdentifier(identifier: string) {
  return identifier.includes("@");
}

export function generateOtp(length = DEFAULT_CONFIG.otpLength) {
  const lower = 10 ** (length - 1);
  const upper = 10 ** length;
  return crypto.randomInt(lower, upper).toString();
}

export function generateProofToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSecret(secret: string) {
  return crypto.createHmac("sha256", getPepper()).update(secret).digest("hex");
}

export function timingSafeEqualHex(a: string, b: string) {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function isLikelyUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function getExpiryIso(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function getCooldownIso(seconds = DEFAULT_CONFIG.cooldownSeconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function buildGenericOtpSendMessage() {
  return {
    success: true,
    message: "If the account exists, a verification code has been sent.",
  };
}

export function isSensitiveStudentUpdate(payload: Record<string, unknown>) {
  return typeof payload.phone === "string";
}

export function isSensitiveManagerUpdate(payload: Record<string, unknown>) {
  return (
    typeof payload.phone === "string" ||
    typeof payload.business_name === "string" ||
    typeof payload.address === "string"
  );
}

export function generateManagedPlaceholderEmail(name: string, roomId: string) {
  const namePart =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "managed-student";

  const stamp = Date.now().toString(36);
  const roomPart = roomId.replace(/-/g, "").slice(0, 8);
  return `${namePart}+${roomPart}-${stamp}@managed.readingspace.local`;
}

export function generateManagedPassword() {
  return crypto.randomBytes(24).toString("base64url");
}
