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
