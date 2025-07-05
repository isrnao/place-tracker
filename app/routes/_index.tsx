import type { Route } from "./+types/_index";
import { useLoaderData } from "react-router";
import { supabase, getMockData } from "~/api/supabase.server";
import PrefectureMap from "~/components/PrefectureMap";
import "maplibre-gl/dist/maplibre-gl.css";
import { readFile } from "fs/promises";
import { resolve } from "path";
import type { FeatureCollection, Feature } from "geojson";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Place Tracker - 日本全国の場所を訪問記録" },
    { name: "description", content: "日本全国の場所を訪問してマークしよう" },
  ];
}

export async function loader() {
  try {
    // ❶ progress 集計
    const progress = supabase
      ? (await supabase.rpc("prefecture_progress")).data ?? getMockData.prefecture_progress()
      : getMockData.prefecture_progress();

    // ❂ GeoJSON ファイル (public/) を読み込む
    const geoJsonPath = resolve("public/japan-prefectures.geojson");
    const geoJsonContent = await readFile(geoJsonPath, "utf-8");
    const geo = JSON.parse(geoJsonContent) as FeatureCollection;

    // progress を GeoJSON Feature にマージ
    const features = geo.features.map((f: Feature) => {
      const p = progress.find((r: any) => r.id === f.properties?.id);
      return {
        ...f,
        properties: {
          ...f.properties,
          visited: p?.visited ?? 0,
          total: p?.total ?? 0,
          progress: p && p.total > 0 ? p.visited / p.total : 0,
        },
      };
    });

    return { features };
  } catch (err) {
    // Fallback: モックデータのみ使用
    const progress = getMockData.prefecture_progress();
    const features = progress.map((p, index) => ({
      type: "Feature" as const,
      properties: {
        id: p.id,
        nam_ja: p.name,
        visited: p.visited,
        total: p.total,
        progress: p.total > 0 ? p.visited / p.total : 0,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [139.7 + (index % 10 - 5) * 0.5, 37.5 + Math.floor(index / 10) * 0.5],
      },
    } as Feature));

    return { features };
  }
}

export default function Home() {
  const { features } = useLoaderData<typeof loader>();

  return (
    <main className="relative h-screen">
      <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Place Tracker</h1>
        <p className="text-sm text-gray-600">
          日本地図をクリックして各都道府県の詳細を確認できます
        </p>
      </div>
      <PrefectureMap features={features} />
    </main>
  );
}
