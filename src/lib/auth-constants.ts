import bcrypt from "bcryptjs";

// Bcrypt work factor. MUST match everywhere we hash passwords
// (login dummy hash, admin create, admin password reset, profile change-password)
// so that bcrypt.compare timing is identical regardless of whether the user
// exists or not.
export const BCRYPT_COST = 12;

// Pre-computed dummy hash, generated at module load time so its cost matches
// BCRYPT_COST. Used by the login authorize() path to equalize response time
// between "user not found" and "user found, wrong password", preventing
// email enumeration via timing side-channels.
//
// The plaintext is irrelevant — it is never verified. Only the work factor
// matters. `hashSync` runs once at server startup (~250-500ms, negligible).
export const DUMMY_BCRYPT_HASH = bcrypt.hashSync(
  "dummy-password-for-timing-attack-prevention",
  BCRYPT_COST,
);
