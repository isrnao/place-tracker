import type { Route } from "./+types/_index";
import { useLoaderData } from "react-router";
import { supabase, getMockData } from "~/api/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Place Tracker - 日本全国の場所を訪問記録" },
    { name: "description", content: "日本全国の場所を訪問してマークしよう" },
  ];
}

export async function loader() {
  try {
    // Supabaseクライアントが利用可能な場合は使用
    if (supabase) {
      const { data, error } = await supabase.rpc("prefecture_progress");
      if (error) throw new Response(JSON.stringify(error), { status: 500 });
      return data;
    } else {
      // モックデータを使用
      return getMockData.prefecture_progress();
    }
  } catch (err) {
    // Fallback data for demo purposes
    return getMockData.prefecture_progress();
  }
}

export default function Home() {
  const prefectures = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Place Tracker
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            日本全国の場所を訪問してマークしよう
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prefectures?.map((prefecture: any) => (
            <div key={prefecture.id} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{prefecture.name}</h3>
              <p className="mt-2 text-sm text-gray-600">
                訪問済み: {prefecture.visited} / {prefecture.total}
              </p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(prefecture.visited / prefecture.total) * 100}%` }}
                />
              </div>
              <a
                href={`/prefecture/${prefecture.id}`}
                className="mt-4 inline-block rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                詳細を見る
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
