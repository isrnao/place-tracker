import type { Route } from "./+types/prefecture-data";
import { supabase, getMockData } from "~/api/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const prefectureId = Number(url.searchParams.get("id"));

  if (!prefectureId) {
    throw new Response("Prefecture ID is required", { status: 400 });
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .rpc("places_with_visit", { p_prefecture: prefectureId });
      if (error) throw new Response(JSON.stringify(error), { status: 500 });
      return {
        places: data,
        prefecture: getMockData.prefecture_progress().find(p => p.id === prefectureId)
      };
    } else {
      return {
        places: getMockData.places_with_visit(prefectureId),
        prefecture: getMockData.prefecture_progress().find(p => p.id === prefectureId)
      };
    }
  } catch (err) {
    return {
      places: getMockData.places_with_visit(prefectureId),
      prefecture: getMockData.prefecture_progress().find(p => p.id === prefectureId)
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const placeId = formData.get("placeId") as string;
  const visited = formData.get("visited") === "true";

  try {
    if (supabase) {
      if (visited) {
        await supabase.from("visits").delete().eq("place_id", placeId);
      } else {
        await supabase.from("visits").insert({ place_id: placeId });
      }
    } else {
      console.log(`Mock: ${visited ? 'Removing' : 'Adding'} visit for place ${placeId}`);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
