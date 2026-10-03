import User from "../models/user.model.js";

function pickName({ firstName, lastName, username, email }) {
  return (
    [firstName, lastName].filter(Boolean).join(" ") ||
    username ||
    email?.split("@")[0] ||
    "User"
  );
}

// Clerk REST API user (camelCase) -> our profile shape
export function profileFromClerkUser(u) {
  const email =
    u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
    u.emailAddresses?.[0]?.emailAddress ??
    `${u.id}@no-email.local`; // email is required + unique in our schema

  return {
    clerkId: u.id,
    email,
    fullName: pickName({
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      email,
    }),
    profilePic: u.imageUrl ?? "",
  };
}

// Clerk webhook payload (snake_case) -> our profile shape
export function profileFromWebhook(u) {
  const email =
    u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ??
    u.email_addresses?.[0]?.email_address ??
    `${u.id}@no-email.local`;

  return {
    clerkId: u.id,
    email,
    fullName: pickName({
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
      email,
    }),
    profilePic: u.image_url ?? "",
  };
}

// Create or update the user in MongoDB. Used by BOTH the webhook and protectRoute,
// so a user shows up even if the webhook never reached the server (e.g. localhost).
export async function upsertUser(profile) {
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };

  try {
    return await User.findOneAndUpdate({ clerkId: profile.clerkId }, profile, options);
  } catch (error) {
    if (error.code !== 11000) throw error;

    // Duplicate key. Either another request just created this same user (race),
    // or this email is already stored under an OLD clerkId (account deleted in Clerk and
    // created again). Re-link the existing document so chat history is kept.
    const existing = await User.findOneAndUpdate({ email: profile.email }, profile, {
      new: true,
    });
    if (existing) return existing;
    throw error;
  }
}
