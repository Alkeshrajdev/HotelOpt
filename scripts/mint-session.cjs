#!/usr/bin/env node
// Mint a Supabase session for browser testing without typing credentials into the app.
//
//   node scripts/mint-session.cjs maker@demo.test 'HotelOpt!2026'
//
// Paste the printed JSON into localStorage under `sb-<project-ref>-auth-token` in the
// running app, remove `ho_demo`, then reload. See HANDOVER.md → "Testing in the browser".
// Never call signOut() from a script: it revokes the session the browser is using.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envFile = path.join(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  fs.readFileSync(envFile, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: node scripts/mint-session.cjs <email> <password>");
  process.exit(2);
}

(async () => {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { console.error(error.message); process.exit(1); }
  const s = data.session;
  const u = s.user;
  // Only what supabase-js needs to resume the session.
  process.stdout.write(JSON.stringify({
    access_token: s.access_token, token_type: s.token_type, expires_in: s.expires_in, expires_at: s.expires_at,
    refresh_token: s.refresh_token,
    user: { id: u.id, aud: u.aud, role: u.role, email: u.email, app_metadata: u.app_metadata, user_metadata: u.user_metadata, created_at: u.created_at, is_anonymous: false },
  }));
})();
