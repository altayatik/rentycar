import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.admin", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });

const demoUsers = [
  {
    username: "admin",
    email: "admin@rentycar.local",
    password: "RentyCarAdmin123!",
    role: "admin",
  },
  {
    username: "demo",
    email: "demo@rentycar.local",
    password: "RentyCarDemo123!",
    role: "reporter",
  },
];

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Copy .env.admin.example to .env.admin and fill in the local-only service role key.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const verifyClient = publishableKey
  ? createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

for (const demoUser of demoUsers) {
  const user = await ensureAuthUser(demoUser);
  await upsertProfile(user.id, demoUser);
}

if (verifyClient) {
  for (const demoUser of demoUsers) {
    await verifyLogin(demoUser);
  }
} else {
  console.warn("Skipped login verification because no VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY was found.");
}

console.log("");
console.log("Demo users ready:");
console.log("admin / RentyCarAdmin123!");
console.log("demo / RentyCarDemo123!");

async function ensureAuthUser(demoUser) {
  const existing = await findUserByEmail(demoUser.email);

  if (existing) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, {
      email: demoUser.email,
      password: demoUser.password,
      email_confirm: true,
      user_metadata: { username: demoUser.username, role: demoUser.role },
    });

    if (error) {
      throw new Error(`Failed to update ${demoUser.email}: ${error.message}`);
    }

    console.log(`Updated auth user ${demoUser.email} and forced password/email confirmation.`);
    return data.user;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: demoUser.email,
    password: demoUser.password,
    email_confirm: true,
    user_metadata: { username: demoUser.username, role: demoUser.role },
  });

  if (error) {
    throw new Error(`Failed to create ${demoUser.email}: ${error.message}`);
  }

  console.log(`Created confirmed auth user ${demoUser.email}.`);
  return data.user;
}

async function upsertProfile(userId, demoUser) {
  const { error } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      username: demoUser.username,
      role: demoUser.role,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to upsert profile for ${demoUser.username}: ${error.message}`);
  }

  console.log(`Upserted profile for ${demoUser.username}.`);
}

async function verifyLogin(demoUser) {
  const { error } = await verifyClient.auth.signInWithPassword({
    email: demoUser.email,
    password: demoUser.password,
  });

  if (error) {
    console.error(`Verification failed for ${demoUser.username}: ${error.message}`);
    process.exit(1);
  }

  await verifyClient.auth.signOut();
  console.log(`Verified login for ${demoUser.username}`);
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list Supabase users: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}
