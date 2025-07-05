import type { Route } from "./+types/_index";
import { useLoaderData } from "react-router";
import { supabase, getMockData } from "~/api/supabase.server";
import PrefectureMap from "~/components/PrefectureMap";
import PrefectureListSidebar from "~/components/PrefectureListSidebar";
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

  // 都道府県リスト用のデータを準備
  const prefectureList = features
    .filter(f => f.properties?.id && f.properties?.nam_ja)
    .map(f => {
      const props = f.properties as any;
      return {
        id: props.id,
        name: props.nam_ja,
        visited: props.visited || 0,
        total: props.total || 0,
        progress: props.progress || 0,
      };
    })
    .sort((a, b) => a.id - b.id);

  return (
    <main className="relative h-screen flex">
      {/* 左サイドバー - 都道府県リスト */}
      <PrefectureListSidebar prefectures={prefectureList} />

      {/* 右側 - マップ */}
      <div className="flex-1 relative">
        <PrefectureMap features={features} />
      </div>
    </main>
  );
}
