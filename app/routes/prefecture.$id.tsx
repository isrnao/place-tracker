import { useLoaderData, Form } from "react-router";
import { supabase, getMockData } from "~/api/supabase.server";

export async function loader({ params }: { params: { id: string } }) {
  const prefectureId = Number(params.id);

  try {
    // Supabaseクライアントが利用可能な場合は使用
    if (supabase) {
      const { data, error } = await supabase
        .rpc("places_with_visit", { p_prefecture: prefectureId });
      if (error) throw new Response(JSON.stringify(error), { status: 500 });
      return {
        places: data,
        prefecture: getMockData.prefecture_progress().find(p => p.id === prefectureId)
      };
    } else {
      // モックデータを使用
      return {
        places: getMockData.places_with_visit(prefectureId),
        prefecture: getMockData.prefecture_progress().find(p => p.id === prefectureId)
      };
    }
  } catch (err) {
    // Fallback data for demo purposes
    return {
      places: getMockData.places_with_visit(prefectureId),
      prefecture: getMockData.prefecture_progress().find(p => p.id === prefectureId)
    };
  }
}

export async function action({ request }: { request: Request }) {
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
      // モックの場合は成功をシミュレート
      console.log(`Mock: ${visited ? 'Removing' : 'Adding'} visit for place ${placeId}`);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export default function Prefecture() {
  const { places, prefecture } = useLoaderData<typeof loader>();

  if (!prefecture) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              都道府県が見つかりません
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← 戻る
          </a>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {prefecture.name}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            訪問済み: {prefecture.visited} / {prefecture.total}
          </p>
          <div className="mt-4 mx-auto max-w-sm">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(prefecture.visited / prefecture.total) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">場所一覧</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {places?.map((place: any) => (
              <li key={place.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg font-medium text-gray-900">
                      {place.name}
                    </span>
                    {place.visited && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        訪問済み
                      </span>
                    )}
                  </div>

                  <Form method="post" replace>
                    <input type="hidden" name="placeId" value={place.id} />
                    <input type="hidden" name="visited" value={String(place.visited)} />
                    <button
                      type="submit"
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        place.visited
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {place.visited ? "✅ 訪問済み解除" : "✅ 訪問済みにする"}
                    </button>
                  </Form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
