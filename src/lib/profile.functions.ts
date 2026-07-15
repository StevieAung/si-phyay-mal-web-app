import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ProfileRow = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string(),
  vehicle_type: z.string(),
  license_plate: z.string(),
  fuel_type: z.string(),
  engine_cc: z.number(),
  qr_code_path: z.string().nullable().optional(),
});
export type ProfileRow = z.infer<typeof ProfileRow>;

const PhoneInput = z.object({ phone: z.string().min(6) });
const IdInput = z.object({ id: z.string().uuid() });
const UpdateInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(6),
  name: z.string().min(1),
  vehicle_type: z.string().min(1),
  license_plate: z.string().min(1),
  fuel_type: z.string().min(1),
  engine_cc: z.number().int().positive(),
});
const QrInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(6),
  qr_path: z.string().min(1),
});
const QrUploadInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(6),
  content_type: z.string().min(1),
  data_base64: z.string().min(1),
  ext: z.string().min(1).max(5),
});
const QrSignedUrlInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(6),
});


async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getProfileByPhoneFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PhoneInput.parse(d))
  .handler(async ({ data }): Promise<ProfileRow | null> => {
    const sb = await admin();
    const { data: rows, error } = await sb.rpc("get_profile_by_phone", { _phone: data.phone });
    if (error) throw new Error(error.message);
    return rows && rows.length > 0 ? (rows[0] as ProfileRow) : null;
  });

export const getProfileByIdFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }): Promise<ProfileRow | null> => {
    const sb = await admin();
    const { data: rows, error } = await sb.rpc("get_profile_by_id", { _id: data.id });
    if (error) throw new Error(error.message);
    return rows && rows.length > 0 ? (rows[0] as ProfileRow) : null;
  });

export const updateProfileByPhoneFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data }): Promise<ProfileRow | null> => {
    const sb = await admin();
    const { data: rows, error } = await sb.rpc("update_profile_by_phone", {
      _id: data.id,
      _phone: data.phone,
      _name: data.name,
      _vehicle_type: data.vehicle_type,
      _license_plate: data.license_plate,
      _fuel_type: data.fuel_type,
      _engine_cc: data.engine_cc,
    });
    if (error) throw new Error(error.message);
    return rows && rows.length > 0 ? (rows[0] as ProfileRow) : null;
  });

export const setProfileQrFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QrInput.parse(d))
  .handler(async ({ data }): Promise<ProfileRow | null> => {
    const sb = await admin();
    const { data: rows, error } = await sb.rpc("set_profile_qr", {
      _id: data.id,
      _phone: data.phone,
      _qr_path: data.qr_path,
    });
    if (error) throw new Error(error.message);
    return rows && rows.length > 0 ? (rows[0] as ProfileRow) : null;
  });

// Verifies (id, phone) matches an existing profile, then uploads QR bytes
// to the private bucket and stores the path on the profile.
export const uploadQrCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QrUploadInput.parse(d))
  .handler(async ({ data }): Promise<ProfileRow | null> => {
    const sb = await admin();
    // Ownership check: profile id must match provided phone.
    const { data: rows, error: pErr } = await sb.rpc("get_profile_by_id", { _id: data.id });
    if (pErr) throw new Error(pErr.message);
    const owner = rows && rows.length > 0 ? rows[0] : null;
    if (!owner || owner.phone !== data.phone) throw new Error("Not authorized");

    const allowed = /^(jpe?g|png|webp)$/i.test(data.ext);
    if (!allowed) throw new Error("Unsupported file type");
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(data.content_type)) {
      throw new Error("Unsupported content type");
    }
    const bytes = Buffer.from(data.data_base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("File too large");

    const path = `${data.id}/${Date.now()}.${data.ext.toLowerCase()}`;
    const { error: upErr } = await sb.storage
      .from("vehicle-qr")
      .upload(path, bytes, { contentType: data.content_type, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: updated, error: sErr } = await sb.rpc("set_profile_qr", {
      _id: data.id,
      _phone: data.phone,
      _qr_path: path,
    });
    if (sErr) throw new Error(sErr.message);
    return updated && updated.length > 0 ? (updated[0] as ProfileRow) : null;
  });

export const getQrSignedUrlFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QrSignedUrlInput.parse(d))
  .handler(async ({ data }): Promise<{ url: string } | null> => {
    const sb = await admin();
    const { data: rows, error: pErr } = await sb.rpc("get_profile_by_id", { _id: data.id });
    if (pErr) throw new Error(pErr.message);
    const owner = rows && rows.length > 0 ? rows[0] : null;
    if (!owner || owner.phone !== data.phone) throw new Error("Not authorized");
    if (!owner.qr_code_path) return null;

    const { data: signed, error: sErr } = await sb.storage
      .from("vehicle-qr")
      .createSignedUrl(owner.qr_code_path, 60 * 10);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Signing failed");
    return { url: signed.signedUrl };
  });

